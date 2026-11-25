//Responsável pelas validações e pelo comportamento das operações do carrinho.

import type { CatalogService } from "../../catalog/mongoDB/catalog.service";

import { CartRepository } from "./cart.repository";

import {
  CartError,
  type CartResponse
} from "./cart.types";

export class CartService {
  constructor(
    private readonly repository: CartRepository,
    private readonly catalog: CatalogService
  ) {}

  // Verifica se o corpo da requisição é um objeto válido.
  private validateBody(body: unknown): Record<string, unknown> {
    if (
      body === null ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      throw new CartError(400, "Corpo da requisição inválido.");
    }

    return body as Record<string, unknown>;
  }

  // Verifica se o ID do produto é válido.
  private validateProductId(productId: unknown): string {
    if (
      typeof productId !== "string" ||
      !productId.trim() ||
      productId.length > 255
    ) {
      throw new CartError(400, "ID do produto inválido.");
    }

    return productId;
  }

  // Consulta o MongoDB para garantir que o produto existe.
  //
  // O carrinho não controla estoque: essa validação
  // ficará para o PostgreSQL durante o checkout.
  private async validateProduct(productId: unknown): Promise<string> {
    const id = this.validateProductId(productId);

    const product = await this.catalog.getProductById(id); //utiliza o CatalogService que já existe no projeto

    if (!product) {
      throw new CartError(404, "Produto não encontrado no catálogo.");
    }

    return id;
  }

  // Valida a quantidade recebida pela API.
  //
  // Na atualização, zero significa remover o produto.
  private validateQuantity(
    value: unknown,
    allowZero = false
  ): number {
    const minimum = allowZero ? 0 : 1;

    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < minimum ||
      value > 99
    ) {
      throw new CartError(
        400,
        `A quantidade deve ser um inteiro entre ${minimum} e 99.`
      );
    }

    return value;
  }

  // Recupera o carrinho do visitante.
  async getCart(key: string): Promise<CartResponse> {
    const items = await this.repository.getItems(key);

    // Mantém a resposta em ordem estável.
    items.sort((a, b) => a.productId.localeCompare(b.productId));

    const totalItems = items.reduce(
      (total, item) => total + item.quantity,
      0
    );

    return {
      items,
      totalItems
    };
  }

  // Adiciona um produto ao carrinho.
  async addItem(
    key: string,
    body: unknown
  ): Promise<CartResponse> {
    const input = this.validateBody(body);

    // Confirma que o produto existe no MongoDB.
    const productId = await this.validateProduct(input.productId);

    // Se não for informada, a quantidade padrão é 1.
    const quantity = this.validateQuantity(
      input.quantity ?? 1
    );

    const added = await this.repository.addItem(
      key,
      productId,
      quantity
    );

    if (!added) {
      throw new CartError(
        400,
        "O carrinho permite no máximo 99 unidades deste produto."
      );
    }

    return this.getCart(key);
  }

  // Substitui a quantidade de um produto.
  async updateQuantity(
    key: string,
    productId: unknown,
    body: unknown
  ): Promise<CartResponse> {
    const input = this.validateBody(body);

    const id = this.validateProductId(productId);

    // Na atualização, zero é permitido.
    const quantity = this.validateQuantity(
      input.quantity,
      true
    );

    if (quantity === 0) {
      // Quantidade zero remove o produto.
      await this.repository.removeItem(key, id);
    } else {
      // Confirma que o produto existe antes de atualizar.
      await this.validateProduct(id);

      await this.repository.setQuantity(
        key,
        id,
        quantity
      );
    }

    return this.getCart(key);
  }

  // Remove um produto específico.
  async removeItem(
    key: string,
    productId: unknown
  ): Promise<CartResponse> {
    const id = this.validateProductId(productId);

    await this.repository.removeItem(key, id);

    return this.getCart(key);
  }

  // Esvazia completamente o carrinho.
  async clear(key: string): Promise<CartResponse> {
    await this.repository.clear(key);

    return {
      items: [],
      totalItems: 0
    };
  }
}

// TODO (AUTENTICACAO):
// Quando o PostgreSQL disponibilizar cadastro e login,
// implementar a associação do carrinho ao userId.
//
// Também será necessário mesclar os produtos de:
// cart:guest:{sessionId}
// com:
// cart:{userId}
//
// Após a mesclagem bem-sucedida, remover o carrinho
// visitante e aplicar o TTL de 7 dias ao autenticado.
