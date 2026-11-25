import { connectMongo, disconnectMongo } from "../../config/mongoDB/mongo";

import type { Product } from "../../modules/catalog/mongoDB/product.types";
import { createProductIndexes } from "../../modules/catalog/mongoDB/products.indexes";

import { stores } from "./store.config";
import { fetchProducts } from "./mockshop.client";
import { mapProduct } from "./product.mapper";

async function main() {
  try {
    const db = await connectMongo();

    await createProductIndexes(db);

    const collection = db.collection<Product>("products");

    let totalProducts = 0;

    for (const store of stores) {
      console.log(`\nImportando categoria: ${store.category.name}`);

      // Extração
      const rawProducts = await fetchProducts(store);

      // Transformação
      const products = rawProducts.map((product) => mapProduct(product, store));

      if (products.length === 0) {
        console.log("Nenhum produto encontrado.");
        continue;
      }

      // Carregamento
      const result = await collection.bulkWrite(
        products.map((product) => {
          const { _id, availabilityStatus, ...fields } = product;

          return {
            updateOne: {
              filter: { _id },

              update: {
                $set: fields,
                $setOnInsert: { availabilityStatus }
              },

              upsert: true
            }
          };
        })
      );

      totalProducts += products.length;
    }

    console.log("Total no MongoDB:", await collection.countDocuments());
  } catch (error) {
    console.error("Erro durante a carga:", error);
    process.exitCode = 1;
  } finally {
    await disconnectMongo();
  }
}

main();
