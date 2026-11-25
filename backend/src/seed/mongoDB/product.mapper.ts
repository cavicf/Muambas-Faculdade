import type { MockShopProduct } from "./mockshop.types";
import type { Store } from "./store.config";
import type { Product } from "../../modules/catalog/mongoDB/product.types";

export function mapProduct(product: MockShopProduct, store: Store): Product {
  // Padronização do identificador
  const originalId = product.id.split("/").pop();

  // Tratamento do preço
  const { amount, currencyCode } = product.priceRange.minVariantPrice;

  const price = Number(amount);

  if (!Number.isFinite(price) || price < 0) {
    throw new Error(`Preço inválido: ${product.id}`);
  }

  if (currencyCode !== "USD") {
    throw new Error(`Moeda não suportada: ${currencyCode}`);
  }

  // Tratamento das imagens
  const image = product.images.nodes[0]?.url ?? "";

  // Mapeamento final pro nosso formato
  return {
    _id: `${store.id}-${originalId}`,
    title: product.title,
    description: product.description,
    brand: product.vendor,
    productType: product.productType,
    tags: product.tags ?? [],
    price,

    availabilityStatus: product.availableForSale ? "Em estoque" : "Esgotado",

    category: {
      slug: store.category.slug,
      name: store.category.name
    },

    image
  };
}
