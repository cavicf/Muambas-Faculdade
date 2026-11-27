import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";

// ==============================================
// MONGODB - Conexão e catálogo
// ==============================================

import {
  connectMongo,
  disconnectMongo
} from "./config/mongoDB/mongo";

import { ProductRepository } from "./modules/catalog/mongoDB/product.repository";

import { CatalogService } from "./modules/catalog/mongoDB/catalog.service";

import { createCatalogRoutes } from "./modules/catalog/mongoDB/catalog.routes";

// ==============================================
// REDIS - Conexão, carrinho e sessões
// ==============================================

import {
  connectRedis,
  disconnectRedis
} from "./config/redis/redis";

import { CartRepository } from "./modules/cart/redis/cart.repository";

import { CartService } from "./modules/cart/redis/cart.service";

import { createCartRoutes } from "./modules/cart/redis/cart.routes";

import { SessionRepository } from "./modules/session/redis/session.repository";

// ==============================================
// POSTGRESQL - Usuários, endereços, estoque, pedidos e outbox
// ==============================================

import {
  connectPostgres,
  disconnectPostgres
} from "./config/postgres/postgres";

import { UserRepository } from "./modules/auth/postgres/user.repository";
import { AuthService } from "./modules/auth/postgres/auth.service";
import { createAuthenticate } from "./modules/auth/postgres/auth.middleware";
import { createAuthRoutes } from "./modules/auth/postgres/auth.routes";

import { AddressRepository } from "./modules/addresses/postgres/address.repository";
import { AddressService } from "./modules/addresses/postgres/address.service";
import { createAddressRoutes } from "./modules/addresses/postgres/address.routes";

import { InventoryRepository } from "./modules/inventory/postgres/inventory.repository";
import { InventoryService } from "./modules/inventory/postgres/inventory.service";
import { createInventoryRoutes } from "./modules/inventory/postgres/inventory.routes";

import { OrderRepository } from "./modules/orders/postgres/order.repository";
import { OrderService } from "./modules/orders/postgres/order.service";
import { createOrderRoutes } from "./modules/orders/postgres/order.routes";

import { OutboxRepository } from "./modules/outbox/postgres/outbox.repository";
import { OutboxProcessor } from "./modules/outbox/outbox.processor";
import { createOutboxRoutes } from "./modules/outbox/outbox.routes";

// ==============================================
// DOCUMENTAÇÃO - Swagger
// ==============================================

import { openApiSpec } from "./docs/openapi";

// Intervalo do processador da outbox (PostgreSQL -> MongoDB).
const OUTBOX_INTERVAL_MS = Number(process.env.OUTBOX_INTERVAL_MS ?? 5000);

// ==============================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==============================================

async function main() {
  const app = express();

  const port = Number(process.env.PORT ?? 3001);

  // Permite requisições do frontend Next.js.
  //
  // credentials: true é necessário para que
  // o navegador envie cookies nas requisições.
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true
    })
  );

  // Permite receber dados no formato JSON.
  app.use(express.json());

  // Permite que o Express interprete os cookies
  // (muambas_guest do visitante e muambas_session do login).
  app.use(cookieParser());

  // ==============================================
  // CONEXÕES COM OS BANCOS
  // ==============================================

  const db = await connectMongo();
  const redis = await connectRedis();
  await connectPostgres();

  // ==============================================
  // MONGODB - Catálogo
  // ==============================================

  const productRepository = new ProductRepository(db);
  const catalogService = new CatalogService(productRepository);

  // ==============================================
  // REDIS - Carrinho e sessões
  // ==============================================

  // Reutilizamos o CatalogService para verificar
  // se os produtos existem no MongoDB.
  const cartService = new CartService(
    new CartRepository(redis),
    catalogService
  );

  const sessionRepository = new SessionRepository(redis);

  // ==============================================
  // POSTGRESQL - Domínio transacional
  // ==============================================

  const authService = new AuthService(new UserRepository(), sessionRepository);

  const addressService = new AddressService(new AddressRepository());

  const inventoryRepository = new InventoryRepository();
  const inventoryService = new InventoryService(inventoryRepository);

  const outboxRepository = new OutboxRepository();

  // O checkout integra os três bancos (Seção 5 do relatório).
  const orderService = new OrderService(
    new OrderRepository(),
    inventoryRepository,
    outboxRepository,
    addressService,
    cartService,
    catalogService
  );

  const outboxProcessor = new OutboxProcessor(outboxRepository, productRepository);

  // ==============================================
  // AUTENTICAÇÃO
  // ==============================================

  // Identifica o usuário (req.user) a partir de session:{tokenId}.
  // Precisa vir antes das rotas: o carrinho usa cart:{userId}
  // quando há login, e cart:guest:{uuid} quando não há.
  app.use("/api", createAuthenticate(sessionRepository));

  // ==============================================
  // ROTAS
  // ==============================================

  app.use("/api", createAuthRoutes(authService, cartService));
  app.use("/api", createCatalogRoutes(catalogService));
  app.use("/api", createInventoryRoutes(inventoryService));
  app.use("/api", createCartRoutes(cartService));
  app.use("/api", createAddressRoutes(addressService));
  app.use("/api", createOrderRoutes(orderService));
  app.use("/api", createOutboxRoutes(outboxRepository, outboxProcessor));

  // ==============================================
  // SWAGGER
  // ==============================================

  app.get("/docs.json", (_req, res) => {
    res.json(openApiSpec);
  });

  // withCredentials: o Swagger envia o cookie de sessão
  // definido pelo login nas chamadas seguintes.
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: "Muambas UNIFEI - API",
      swaggerOptions: {
        withCredentials: true,
        persistAuthorization: true,
        displayRequestDuration: true
      }
    })
  );

  // ==============================================
  // ROTA DE VERIFICAÇÃO
  // ==============================================

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok"
    });
  });

  // ==============================================
  // INICIALIZAÇÃO DO SERVIDOR
  // ==============================================

  const server = app.listen(port, () => {
    console.log(
      `Servidor rodando em http://localhost:${port}`
    );
    console.log(
      `Swagger disponível em http://localhost:${port}/docs`
    );
  });

  // Sincronização PostgreSQL -> MongoDB em segundo plano.
  outboxProcessor.start(OUTBOX_INTERVAL_MS);

  // Encerra o servidor e as conexões com os bancos.
  function shutdown() {
    outboxProcessor.stop();

    server.close(async () => {
      await Promise.allSettled([
        disconnectMongo(),
        disconnectRedis(),
        disconnectPostgres()
      ]);

      process.exit(0);
    });
  }

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

// ==============================================
// TRATAMENTO DE FALHAS NA INICIALIZAÇÃO
// ==============================================

main().catch(async (error) => {
  console.error("Erro ao iniciar servidor:", error);

  // Tenta fechar as conexões existentes.
  await Promise.allSettled([
    disconnectMongo(),
    disconnectRedis(),
    disconnectPostgres()
  ]);

  process.exitCode = 1;
});
