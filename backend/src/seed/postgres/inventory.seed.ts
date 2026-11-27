// Seed do estoque inicial (tabela inventory).
//
// A mock.shop informa apenas se o produto está disponível, sem
// quantidade. Por isso, a partir do catálogo já carregado no MongoDB:
// - produto "Esgotado"   -> quantidade 0
// - produto "Em estoque" -> quantidade aleatória entre 5 e 50
//
// Assim o espelho availabilityStatus do MongoDB já nasce coerente
// com o estoque oficial do PostgreSQL.
//
// Idempotente: só cria estoque para produtos que ainda não têm linha.
// Pré-requisito: npm run seed:mongo

import { connectMongo, disconnectMongo } from "../../config/mongoDB/mongo";
import {
  connectPostgres,
  disconnectPostgres
} from "../../config/postgres/postgres";

import type { Product } from "../../modules/catalog/mongoDB/product.types";
import { InventoryRepository } from "../../modules/inventory/postgres/inventory.repository";

const MIN_STOCK = 5;
const MAX_STOCK = 50;

function randomStock(): number {
  return MIN_STOCK + Math.floor(Math.random() * (MAX_STOCK - MIN_STOCK + 1));
}

async function main() {
  try {
    const db = await connectMongo();
    await connectPostgres();

    const products = await db
      .collection<Product>("products")
      .find({}, { projection: { _id: 1, availabilityStatus: 1 } })
      .toArray();

    if (products.length === 0) {
      console.log("Nenhum produto no MongoDB. Rode antes: npm run seed:mongo");
      process.exitCode = 1;
      return;
    }

    const items = products.map((product) => ({
      productId: product._id,
      quantity: product.availabilityStatus === "Esgotado" ? 0 : randomStock()
    }));

    const inserted = await new InventoryRepository().insertMissing(items);

    console.log(`Produtos no catálogo: ${products.length}`);
    console.log(`Estoques criados agora: ${inserted}`);
    console.log(`Já existentes (mantidos): ${products.length - inserted}`);
  } catch (error) {
    console.error("Erro durante a carga do estoque:", error);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([disconnectMongo(), disconnectPostgres()]);
  }
}

main();
