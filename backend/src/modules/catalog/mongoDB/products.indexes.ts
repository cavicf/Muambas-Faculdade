import type { Db } from "mongodb";
import type { Product } from "./product.types";

export async function createProductIndexes(db: Db) {
  const collection = db.collection<Product>("products");

  await collection.createIndexes([
    {
      key: { "category.slug": 1, price: 1 },
      name: "idx_category_price"
    },
    {
      key: { price: 1 },
      name: "idx_price"
    },
    {
      key: { brand: 1 },
      name: "idx_brand"
    },
    {
      key: {
        title: "text",
        description: "text",
        brand: "text",
        productType: "text",
        tags: "text"
      },
      name: "idx_product_search",
      default_language: "english",
      weights: {
        title: 10,
        productType: 5,
        tags: 3,
        brand: 2,
        description: 1
      }
    }
  ]);

  console.log("Índices criados com sucesso!");
}
