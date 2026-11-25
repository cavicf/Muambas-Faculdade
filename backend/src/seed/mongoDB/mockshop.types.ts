export interface MockShopProduct {
  id: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  tags: string[];
  availableForSale: boolean;

  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };

  images: {
    nodes: {
      url: string;
    }[];
  };
}

export interface MockShopResponse {
  data?: {
    products: {
      nodes: MockShopProduct[];
    };
  };

  errors?: {
    message: string;
  }[];
}
