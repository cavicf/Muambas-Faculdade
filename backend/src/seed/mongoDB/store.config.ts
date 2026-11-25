import type { Category } from "../../modules/catalog/mongoDB/product.types";

// indica a categoria correta de cada endpoint que usaremos
export interface Store {
  id: string;
  url: string;
  category: Category;
}

export const stores: Store[] = [
  {
    id: "apparel",
    url: "https://apparel.mock.shop/api",
    category: {
      slug: "moda",
      name: "Moda"
    }
  },
  {
    id: "common-circuit-ea62fe2c",
    url: "https://common-circuit-ea62fe2c.mock.shop/api",
    category: {
      slug: "eletronicos",
      name: "Eletrônicos"
    }
  },
  {
    id: "common-basin-50698a63",
    url: "https://common-basin-50698a63.mock.shop/api",
    category: {
      slug: "beleza",
      name: "Beleza"
    }
  },
  {
    id: "common-measure-b39834d7",
    url: "https://common-measure-b39834d7.mock.shop/api",
    category: {
      slug: "casa",
      name: "Casa"
    }
  },
  {
    id: "common-table-pantry-7bfb854a",
    url: "https://common-table-pantry-7bfb854a.mock.shop/api",
    category: {
      slug: "mercearia",
      name: "Mercearia"
    }
  }
];
