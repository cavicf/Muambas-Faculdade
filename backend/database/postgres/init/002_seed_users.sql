-- ==================================================
-- MUAMBAS UNIFEI - SEED DE USUÁRIOS DE TESTE
-- ==================================================
--
-- Executado automaticamente na PRIMEIRA inicialização do container
-- (logo após 001_schema.sql). Para um banco que já existe, rode:
--   cd backend && npm run seed:postgres
--
-- Idempotente: pode ser executado várias vezes sem duplicar usuários.
--
-- As senhas são gravadas como hash bcrypt ($2a$, custo 10) gerado pela
-- extensão pgcrypto, compatível com as bibliotecas bcrypt/bcryptjs do
-- Node.js. Senha de todos os usuários de teste: 1234567

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (name, username, email, password_hash)
VALUES
  ('Rodolfo Alberti Silva',          'rodolfo', 'rodolfo@unifei.edu.br', crypt('1234567', gen_salt('bf', 10))),
  ('Luís Gustavo Riso Santos',       'luis',    'luis@unifei.edu.br',    crypt('1234567', gen_salt('bf', 10))),
  ('Camily Victal Finamor',          'camily',  'camily@unifei.edu.br',  crypt('1234567', gen_salt('bf', 10))),
  ('João Victor Jacometti de Assis', 'joao',    'joao@unifei.edu.br',    crypt('1234567', gen_salt('bf', 10)))
ON CONFLICT ((LOWER(email))) DO NOTHING;
