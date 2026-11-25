import { ProductRepository } from "./product.repository";
import type { ProductFilters } from "./product.types";

export class CatalogService {
  constructor(private repository: ProductRepository) {}

  // Listar, pesquisar e filtrar produtos
  async getProducts(filters: ProductFilters = {}) {
    const { minPrice, maxPrice, priceOrder } = filters;

    if (
      minPrice !== undefined &&
      (!Number.isFinite(minPrice) || minPrice < 0)
    ) {
      throw new Error("Preço mínimo inválido.");
    }

    if (
      maxPrice !== undefined &&
      (!Number.isFinite(maxPrice) || maxPrice < 0)
    ) {
      throw new Error("Preço máximo inválido.");
    }

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      throw new Error("O preço mínimo não pode superar o máximo.");
    }

    if (
      priceOrder !== undefined &&
      priceOrder !== "asc" &&
      priceOrder !== "desc"
    ) {
      throw new Error("Ordenação inválida.");
    }

    return this.repository.findProducts(filters);
  }

  // Buscar um produto específico
  async getProductById(id: string) {
    return this.repository.findProductById(id);
  }

  // Listar categorias
  async getCategories() {
    return this.repository.findCategories();
  }

  // Buscar vários produtos
  async getProductsByIds(ids: string[]) {
    return this.repository.findProductsByIds(ids);
  }
}
