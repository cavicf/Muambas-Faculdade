
import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

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
// REDIS - Conexão e carrinho
// ==============================================

import {
  connectRedis,
  disconnectRedis
} from "./config/redis/redis";

import { CartRepository } from "./modules/cart/redis/cart.repository";

import { CartService } from "./modules/cart/redis/cart.service";

import { createCartRoutes } from "./modules/cart/redis/cart.routes";

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

  // Permite que o Express interprete os cookies.
  //
  // O carrinho de visitante utiliza um UUID
  // criado automaticamente, sem COOKIE_SECRET.
  app.use(cookieParser());

  // ==============================================
  // MONGODB - Catálogo
  // ==============================================

  // Estabelece a conexão com o MongoDB.
  const db = await connectMongo();

  // Inicializa a camada de persistência do catálogo.
  const productRepository = new ProductRepository(db);

  // Inicializa as regras de negócio do catálogo.
  const catalogService = new CatalogService(productRepository);

  // Registra as rotas existentes do MongoDB.
  app.use("/api", createCatalogRoutes(catalogService));

  // ==============================================
  // REDIS - Carrinho
  // ==============================================

  // Estabelece a conexão com o Redis.
  const redis = await connectRedis();

  // Inicializa a camada de persistência do carrinho.
  const cartRepository = new CartRepository(redis);

  // Inicializa as regras de negócio do carrinho.
  //
  // Reutilizamos o CatalogService para verificar
  // se os produtos existem no MongoDB.
  const cartService = new CartService(
    cartRepository,
    catalogService
  );

  // Registra as rotas REST do carrinho.
  app.use("/api", createCartRoutes(cartService));

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
  });

  // Encerra o servidor e as conexões com os bancos.
  function shutdown() {
    server.close(async () => {
      await Promise.allSettled([
        disconnectMongo(),
        disconnectRedis()
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
    disconnectRedis()
  ]);

  process.exitCode = 1;
});

// TODO (MODULO AUTH):
// Quando o PostgreSQL disponibilizar usuários,
// cadastro e login, registrar os middlewares e
// as rotas de autenticação.
//
// Se a equipe adotar sessões Redis, o módulo
// de autenticação deverá gerenciar:
// session:{tokenId}
//
// O carrinho autenticado utilizará:
// cart:{userId}
//
// Essas funcionalidades NÃO fazem parte da
// implementação atual do carrinho visitante.
