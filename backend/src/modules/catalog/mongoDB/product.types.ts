export interface Category {
  slug: string;
  name: string;
}

export interface Product {
  _id: string;
  title: string;
  description: string;
  brand: string;
  productType: string;
  tags: string[];
  price: number;
  availabilityStatus: "Em estoque" | "Esgotado";
  category: Category;
  image: string;
}

export interface ProductFilters {
  category?: string;
  brand?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  priceOrder?: "asc" | "desc";
}

export interface CategorySummary {
  _id: string;
  name: string;
  productCount: number;
}
