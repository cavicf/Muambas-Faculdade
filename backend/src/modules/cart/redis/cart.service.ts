//Responsável pelas validações e pelo comportamento das operações do carrinho.


import type { CatalogService } from "../../catalog/mongoDB/catalog.service";

import { CartRepository } from "./cart.repository";

import type { CartContext } from "./cart.context";

import {
  CartError,
  type CartResponse
} from "./cart.types";

export class CartService {
  constructor(
    private readonly repository: CartRepository,
    private readonly catalog: CatalogService
  ) {}

  // Verifica se o corpo da requisicao e valido.
  private validateBody(
    body: unknown
  ): Record<string, unknown> {
    if (
      body === null ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      throw new CartError(
        400,
        "Corpo da requisicao invalido."
      );
    }

    return body as Record<string, unknown>;
  }

  // Verifica o formato do identificador do produto.
  private validateProductId(
    productId: unknown
  ): string {
    if (
      typeof productId !== "string" ||
      !productId.trim() ||
      productId.length > 255
    ) {
      throw new CartError(
        400,
        "ID do produto invalido."
      );
    }

    return productId;
  }

  // Confirma que o produto existe no MongoDB.
  // O estoque sera validado pelo PostgreSQL no checkout.
  private async validateProduct(
    productId: unknown
  ): Promise<string> {
    const id = this.validateProductId(productId);

    const product = await this.catalog.getProductById(id);

    if (!product) {
      throw new CartError(
        404,
        "Produto nao encontrado no catalogo."
      );
    }

    return id;
  }

  // Valida quantidades de 1 a 99.
  // Na atualizacao, zero permite remover o item.
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

  // Consulta o carrinho de qualquer contexto.
  async getCart(
    context: CartContext
  ): Promise<CartResponse> {
    const items = await this.repository.getItems(context);

    items.sort(
      (a, b) => a.productId.localeCompare(b.productId)
    );

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
    context: CartContext,
    body: unknown
  ): Promise<CartResponse> {
    const input = this.validateBody(body);

    const productId = await this.validateProduct(
      input.productId
    );

    const quantity = this.validateQuantity(
      input.quantity ?? 1
    );

    const added = await this.repository.addItem(
      context,
      productId,
      quantity
    );

    if (!added) {
      throw new CartError(
        400,
        "O carrinho permite no maximo 99 unidades deste produto."
      );
    }

    return this.getCart(context);
  }

  // Define uma nova quantidade para o produto.
  async updateQuantity(
    context: CartContext,
    productId: unknown,
    body: unknown
  ): Promise<CartResponse> {
    const input = this.validateBody(body);

    const id = this.validateProductId(productId);

    const quantity = this.validateQuantity(
      input.quantity,
      true
    );

    if (quantity === 0) {
      await this.repository.removeItem(context, id);
    } else {
      await this.validateProduct(id);

      await this.repository.setQuantity(
        context,
        id,
        quantity
      );
    }

    return this.getCart(context);
  }

  // Remove um produto do carrinho.
  async removeItem(
    context: CartContext,
    productId: unknown
  ): Promise<CartResponse> {
    const id = this.validateProductId(productId);

    await this.repository.removeItem(context, id);

    return this.getCart(context);
  }

  // Esvazia completamente o carrinho.
  async clear(
    context: CartContext
  ): Promise<CartResponse> {
    await this.repository.clear(context);

    return {
      items: [],
      totalItems: 0
    };
  }
}

// TODO (INTEGRACAO AUTH):
// O middleware de autenticacao devera construir
// createUserCartContext(req.user.id).
//
// A mesclagem do carrinho visitante com o carrinho
// autenticado sera implementada na proxima entrega.
