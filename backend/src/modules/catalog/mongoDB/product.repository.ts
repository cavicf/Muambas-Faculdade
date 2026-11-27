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
    }

    const search = filters.search?.trim();

  // Pesquisa textual por termos
  if (search) {
    const textQuery: Filter<Product> = {
      ...query,
      $text: {
        $search: search
      }
    };

    const textSort: Sort = filters.priceOrder
      ? sort
      : {
          score: { $meta: "textScore" },
          _id: 1
        };

    const products = await this.collection
      .find(textQuery)
      .sort(textSort)
      .toArray();

    if (products.length > 0) {
      return products;
    }

    // Tratamento dos caracteres especiais
    const pattern = search.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    // Pesquisa por padrões com regex
    query.$or = [
      { title: { $regex: pattern, $options: "i" } },
      { description: { $regex: pattern, $options: "i" } },
      { brand: { $regex: pattern, $options: "i" } },
      { productType: { $regex: pattern, $options: "i" } },
      { tags: { $regex: pattern, $options: "i" } }
    ];
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

  // Listar marcas disponíveis
  async findBrands(): Promise<string[]> {
    return this.collection.distinct("brand");
  }

  // Buscar o maior preço do catálogo
  async findMaxPrice(): Promise<number> {
    const result = await this.collection
      .aggregate([
        {
          $group: {
            _id: null,
            maxPrice: { $max: "$price" }
          }
        }
      ])
      .toArray();

    return result[0]?.maxPrice ?? 0;
  }

  // Buscar vários produtos pelos IDs
  async findProductsByIds(ids: string[]): Promise<Product[]> {
    return this.collection
      .find({
        _id: { $in: ids }
      })
      .toArray();
  }

  // Atualiza o espelho de disponibilidade do produto.
  //
  // Chamado somente pelo OutboxProcessor: o estoque oficial
  // fica no PostgreSQL (tabela inventory).
  //
  // Retorna false se o produto não existir no catálogo.
  async updateAvailability(
    id: string,
    availabilityStatus: Product["availabilityStatus"]
  ): Promise<boolean> {
    const result = await this.collection.updateOne(
      { _id: id },
      { $set: { availabilityStatus } }
    );

    return result.matchedCount > 0;
  }
}
