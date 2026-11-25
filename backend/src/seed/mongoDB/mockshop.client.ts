import type { MockShopProduct, MockShopResponse } from "./mockshop.types";

import type { Store } from "./store.config";

// Consulta de extração de dados dos endpoints da Shopify em GraphQL
const PRODUCTS_QUERY = `
  query GetProducts {
    products(first: 100) {
      nodes {
        id
        title
        description
        vendor
        productType
        tags
        availableForSale

        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }

        images(first: 1) {
          nodes {
            url
          }
        }
      }
    }
  }
`;

export async function fetchProducts(store: Store): Promise<MockShopProduct[]> {
  const response = await fetch(store.url, {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      query: PRODUCTS_QUERY
    })
  });

  if (!response.ok) {
    throw new Error(`Erro HTTP ${response.status} na loja ${store.id}`);
  }

  const result = (await response.json()) as MockShopResponse;

  if (result.errors?.length || !result.data) {
    throw new Error(
      `Erro GraphQL na loja ${store.id}: ${JSON.stringify(result.errors)}`
    );
  }

  const products = result.data.products.nodes;

  console.log(`[${store.id}] ${products.length} produtos extraídos`);

  return products;
}
