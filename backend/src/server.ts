import "dotenv/config";

import express from "express";
import cors from "cors";

import { connectMongo, disconnectMongo } from "./config/mongoDB/mongo";

import { ProductRepository } from "./modules/catalog/mongoDB/product.repository";

import { CatalogService } from "./modules/catalog/mongoDB/catalog.service";

import { createCatalogRoutes } from "./modules/catalog/mongoDB/catalog.routes";

async function main() {
  const app = express();

  const port = Number(process.env.PORT ?? 3001);

  app.use(
    cors({
      origin: "http://localhost:3000"
    })
  );

  app.use(express.json());

  // Conexão com o MongoDB
  const db = await connectMongo();

  // Inicialização do catálogo
  const repository = new ProductRepository(db);
  const service = new CatalogService(repository);

  // Rotas do catálogo
  app.use("/api", createCatalogRoutes(service));

  // Rota para testar o servidor
  app.get("/health", (req, res) => {
    res.json({
      status: "ok"
    });
  });

  // Inicialização do servidor
  const server = app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });

  function shutdown() {
    server.close(async () => {
      await disconnectMongo();
      process.exit(0);
    });
  }

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch(async (error) => {
  console.error("Erro ao iniciar servidor:", error);
  await disconnectMongo();
  process.exitCode = 1;
});
