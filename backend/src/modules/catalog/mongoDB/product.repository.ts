import type { Db, Collection, Filter, Sort } from "mongodb";

import type { Product, ProductFilters, CategorySummary } from "./product.types";

export class ProductRepository {
  private collection: Collection<Product>;

  constructor(db: Db) {
    this.collection = db.collection<Product>("products");
  }

  // Listar, pesquisar e filtrar produtos
  async findProducts(filters: ProductFilters = {}): Promise<Product[]> {
    const query: Filter<Product> = {};

    // Filtro por categoria
    if (filters.category) {
      query["category.slug"] = filters.category;
    }

    // Filtro por marca
    if (filters.brand) {
      query.brand = filters.brand;
    }

    // Pesquisa textual
    if (filters.search?.trim()) {
      query.$text = {
        $search: filters.search.trim()
      };
    }

    // Filtro por faixa de preço
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceFilter: {
        $gte?: number;
        $lte?: number;
      } = {};

      if (filters.minPrice !== undefined) {
        priceFilter.$gte = filters.minPrice;
      }

      if (filters.maxPrice !== undefined) {
        priceFilter.$lte = filters.maxPrice;
      }

      query.price = priceFilter;
    }

    // Ordenação
    let sort: Sort = { _id: 1 };

    if (filters.priceOrder === "asc") {
      sort = { price: 1, _id: 1 };
    } else if (filters.priceOrder === "desc") {
      sort = { price: -1, _id: 1 };
    } else if (filters.search?.trim()) {
      sort = {
        score: { $meta: "textScore" },
        _id: 1
      };
    }

    // Consultar e retornar produtos
    return this.collection.find(query).sort(sort).toArray();
  }

  // Buscar um produto pelo ID
  async findProductById(id: string): Promise<Product | null> {
    return this.collection.findOne({
      _id: id
    });
  }

  // Listar categorias e contar produtos
  async findCategories(): Promise<CategorySummary[]> {
    return this.collection
      .aggregate<CategorySummary>([
        {
          $group: {
            _id: "$category.slug",
            name: { $first: "$category.name" },
            productCount: { $count: {} }
          }
        },
        {
          $sort: { name: 1 }
        }
      ])
      .toArray();
  }

  // Buscar vários produtos pelos IDs
  async findProductsByIds(ids: string[]): Promise<Product[]> {
    return this.collection
      .find({
        _id: { $in: ids }
      })
      .toArray();
  }
}
