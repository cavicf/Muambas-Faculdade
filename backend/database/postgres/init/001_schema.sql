-- ==================================================
-- MUAMBAS UNIFEI - SCHEMA POSTGRESQL
-- ==================================================
--
-- Implementa o modelo relacional definido pela equipe
-- (diagrama "PostgreSQL - Modelo Relacional"):
-- users, addresses, inventory, orders, order_items,
-- payments e outbox_events.
--
-- Este arquivo é executado automaticamente pelo container
-- do PostgreSQL somente na PRIMEIRA inicialização, ou seja,
-- quando o volume postgres_data ainda está vazio.
--
-- Para recriar o banco do zero (APAGA os dados do PostgreSQL):
--   docker compose rm -sf postgres
--   docker volume rm muambas-faculdade_postgres_data
--   docker compose up -d postgres
-- (o prefixo do volume é o nome da pasta do projeto; confira com
--  `docker volume ls`)
--
-- Identificador comum: product_id é o mesmo id usado
-- no MongoDB (_id) e no Redis (campo do hash do carrinho).

BEGIN;

-- ==================================================
-- FUNÇÃO AUXILIAR - updated_at automático
-- ==================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- USERS - Usuários da aplicação
-- ==================================================

CREATE TABLE users (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  username       VARCHAR(80)  NOT NULL,
  email          VARCHAR(255) NOT NULL,

  -- Hash bcrypt da senha. Nunca armazenar a senha pura.
  password_hash  VARCHAR(255) NOT NULL,

  created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),

  CONSTRAINT users_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT users_username_not_blank CHECK (btrim(username) <> ''),
  CONSTRAINT users_email_format CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- Unicidade sem diferenciar maiúsculas/minúsculas.
CREATE UNIQUE INDEX users_email_unique    ON users (LOWER(email));
CREATE UNIQUE INDEX users_username_unique ON users (LOWER(username));

-- ==================================================
-- ADDRESSES - Endereços de entrega (N endereços por usuário)
-- ==================================================

CREATE TABLE addresses (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  recipient_name  VARCHAR(150) NOT NULL,
  street          VARCHAR(200) NOT NULL,
  street_number   VARCHAR(20)  NOT NULL,
  complement      VARCHAR(120),
  neighborhood    VARCHAR(120),
  city            VARCHAR(120) NOT NULL,
  state           VARCHAR(2)   NOT NULL,
  postal_code     VARCHAR(10)  NOT NULL,

  CONSTRAINT addresses_state_format CHECK (state ~ '^[A-Z]{2}$'),
  -- Aceita CEP com ou sem hífen: 37500000 ou 37500-000.
  CONSTRAINT addresses_postal_code_format CHECK (postal_code ~ '^[0-9]{5}-?[0-9]{3}$')
);

CREATE INDEX addresses_user_id_idx ON addresses (user_id);

-- ==================================================
-- INVENTORY - Estoque (fonte da verdade)
-- ==================================================
--
-- O MongoDB guarda apenas um espelho (availabilityStatus).
-- No checkout, as linhas são bloqueadas com SELECT ... FOR UPDATE,
-- a quantidade é baixada e um evento é gravado em outbox_events.

CREATE TABLE inventory (
  -- Id do produto da mock.shop (mesmo _id do MongoDB).
  product_id          VARCHAR(255) PRIMARY KEY,
  quantity_available  INTEGER      NOT NULL DEFAULT 0,
  updated_at          TIMESTAMP    NOT NULL DEFAULT NOW(),

  CONSTRAINT inventory_product_id_not_blank CHECK (btrim(product_id) <> ''),
  CONSTRAINT inventory_available_non_negative CHECK (quantity_available >= 0)
);

CREATE TRIGGER inventory_set_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==================================================
-- ORDERS - Pedidos
-- ==================================================

CREATE TABLE orders (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                    BIGINT        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  address_id                 BIGINT        NOT NULL REFERENCES addresses (id) ON DELETE RESTRICT,

  -- Cópia textual do endereço no momento da compra,
  -- mantém o histórico correto mesmo se o endereço mudar.
  shipping_address_snapshot  TEXT          NOT NULL,

  status                     VARCHAR(30)   NOT NULL DEFAULT 'criado',
  total_amount               NUMERIC(12,2) NOT NULL,
  created_at                 TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMP     NOT NULL DEFAULT NOW(),

  CONSTRAINT orders_status_valid CHECK (
    status IN ('criado', 'pago', 'enviado', 'entregue', 'cancelado')
  ),
  CONSTRAINT orders_total_non_negative CHECK (total_amount >= 0)
);

-- Página "Meus pedidos": pedidos do usuário, mais recentes primeiro.
CREATE INDEX orders_user_created_idx ON orders (user_id, created_at DESC);
CREATE INDEX orders_address_id_idx ON orders (address_id);

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==================================================
-- ORDER_ITEMS - Itens do pedido (snapshot de preço/título)
-- ==================================================
--
-- Título e preço são copiados no momento da compra, para que
-- o histórico não mude se o produto mudar no MongoDB.

CREATE TABLE order_items (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id       BIGINT        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id     VARCHAR(255)  NOT NULL REFERENCES inventory (product_id) ON DELETE RESTRICT,
  product_title  VARCHAR(255)  NOT NULL,
  unit_price     NUMERIC(12,2) NOT NULL,
  quantity       INTEGER       NOT NULL,

  -- Calculado pelo banco, sempre consistente com preço x quantidade.
  subtotal       NUMERIC(12,2) NOT NULL GENERATED ALWAYS AS (unit_price * quantity) STORED,

  CONSTRAINT order_items_unit_price_non_negative CHECK (unit_price >= 0),
  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT order_items_unique_product UNIQUE (order_id, product_id)
);

CREATE INDEX order_items_product_id_idx ON order_items (product_id);

-- ==================================================
-- PAYMENTS - Pagamento simulado
-- ==================================================

CREATE TABLE payments (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id    BIGINT        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  method      VARCHAR(40)   NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  status      VARCHAR(30)   NOT NULL DEFAULT 'pendente',
  created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),

  -- Mesmas formas oferecidas no front-end (PaymentOptions).
  CONSTRAINT payments_method_valid CHECK (method IN ('Pix', 'Cartão', 'Boleto')),
  CONSTRAINT payments_status_valid CHECK (
    status IN ('pendente', 'aprovado', 'recusado', 'estornado')
  ),
  CONSTRAINT payments_amount_non_negative CHECK (amount >= 0)
);

CREATE INDEX payments_order_id_idx ON payments (order_id);

-- ==================================================
-- OUTBOX_EVENTS - Eventos a propagar para MongoDB/Redis
-- ==================================================
--
-- Gravados na mesma transação do pedido (ex.: baixa de estoque).
-- Um processo do back-end lê os pendentes, atualiza o
-- availabilityStatus no MongoDB e marca o evento como processado.
-- Garante consistência eventual entre os bancos.
--
-- order_id é opcional: eventos como um ajuste manual de estoque
-- não pertencem a um pedido.

CREATE TABLE outbox_events (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id      BIGINT      REFERENCES orders (id) ON DELETE SET NULL,
  event_type    VARCHAR(80) NOT NULL,   -- ex.: 'inventory.changed'
  payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  status        VARCHAR(30) NOT NULL DEFAULT 'pendente',
  attempts      INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMP,

  CONSTRAINT outbox_events_status_valid CHECK (
    status IN ('pendente', 'processado', 'falhou')
  ),
  CONSTRAINT outbox_events_attempts_non_negative CHECK (attempts >= 0)
);

CREATE INDEX outbox_events_order_id_idx ON outbox_events (order_id);

-- Busca rápida apenas dos eventos ainda não processados, em ordem.
CREATE INDEX outbox_events_pending_idx
  ON outbox_events (created_at, id)
  WHERE status = 'pendente';

COMMIT;
