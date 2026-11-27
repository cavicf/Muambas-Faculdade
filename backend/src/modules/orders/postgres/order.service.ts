// Checkout e histórico de pedidos.
//
// O checkout implementa o fluxo da Seção 5 do relatório,
// integrando os três bancos:
//
// 1. Lê o carrinho do usuário no Redis.
// 2. Busca preço e título atuais de cada item no MongoDB.
// 3. Abre uma transação no PostgreSQL, bloqueia as linhas de
//    estoque (FOR UPDATE) e verifica se há quantidade suficiente.
// 4. Na mesma transação: baixa o estoque, cria o pedido, os itens,
//    o pagamento simulado e um evento na outbox por produto.
//    Se qualquer passo falhar, ROLLBACK: nada é baixado nem cobrado.
// 5. Após o COMMIT, remove o carrinho do Redis.
// 6. (assíncrono) O OutboxProcessor atualiza o availabilityStatus
//    no MongoDB a partir dos eventos.

import { withTransaction } from "../../../config/postgres/postgres";
import { HttpError, requireBody, requireId } from "../../../shared/http";

import type { AddressService } from "../../addresses/postgres/address.service";
import { formatAddressSnapshot } from "../../addresses/postgres/address.types";
import type { CartContext } from "../../cart/redis/cart.context";
import type { CartService } from "../../cart/redis/cart.service";
import type { CatalogService } from "../../catalog/mongoDB/catalog.service";
import type { InventoryRepository } from "../../inventory/postgres/inventory.repository";
import type { OutboxRepository } from "../../outbox/postgres/outbox.repository";
import {
  INVENTORY_CHANGED,
  type InventoryChangedPayload
} from "../../outbox/postgres/outbox.types";

import type { OrderRepository } from "./order.repository";
import {
  PAYMENT_METHODS,
  type CheckoutLine,
  type Order,
  type PaymentMethod
} from "./order.types";

// Soma em centavos para evitar erros de ponto flutuante (0.1 + 0.2).
function toCents(value: number): number {
  return Math.round(value * 100);
}

export class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly inventory: InventoryRepository,
    private readonly outbox: OutboxRepository,
    private readonly addresses: AddressService,
    private readonly cart: CartService,
    private readonly catalog: CatalogService
  ) {}

  private parsePaymentMethod(value: unknown): PaymentMethod {
    if (!PAYMENT_METHODS.includes(value as PaymentMethod)) {
      throw new HttpError(
        400,
        `paymentMethod deve ser: ${PAYMENT_METHODS.join(", ")}.`
      );
    }

    return value as PaymentMethod;
  }

  async checkout(
    userId: number,
    cartContext: CartContext,
    body: unknown
  ): Promise<Order> {
    const input = requireBody(body);
    const addressId = requireId(input.addressId, "addressId");
    const paymentMethod = this.parsePaymentMethod(input.paymentMethod);

    // ------------------------------------------------
    // 1. REDIS: carrinho do usuário
    // ------------------------------------------------
    const { items: cartItems } = await this.cart.getCart(cartContext);

    if (cartItems.length === 0) {
      throw new HttpError(400, "O carrinho está vazio.");
    }

    // ------------------------------------------------
    // 2. MONGODB: preço e título atuais
    // ------------------------------------------------
    const productIds = cartItems.map((item) => item.productId);
    const products = await this.catalog.getProductsByIds(productIds);
    const productsById = new Map(
      products.map((product) => [product._id, product])
    );

    const missing = productIds.filter((id) => !productsById.has(id));

    if (missing.length > 0) {
      throw new HttpError(
        409,
        "Há produtos no carrinho que não existem mais no catálogo.",
        {
          productIds: missing
        }
      );
    }

    const lines: CheckoutLine[] = cartItems.map((item) => {
      const product = productsById.get(item.productId)!;

      return {
        productId: item.productId,
        productTitle: product.title,
        unitPrice: product.price,
        quantity: item.quantity
      };
    });

    const totalAmount =
      lines.reduce(
        (total, line) => total + toCents(line.unitPrice) * line.quantity,
        0
      ) / 100;

    // ------------------------------------------------
    // 3 e 4. POSTGRESQL: transação ACID
    // ------------------------------------------------
    const orderId = await withTransaction(async (client) => {
      // O endereço precisa ser do próprio usuário.
      const address = await this.addresses.getOwned(userId, addressId, client);

      // 3. Bloqueia as linhas de estoque até o COMMIT/ROLLBACK.
      const stock = await this.inventory.lockForUpdate(client, productIds);
      const stockById = new Map(
        stock.map((row) => [row.product_id, row.quantity_available])
      );

      const unavailable = lines
        .filter((line) => (stockById.get(line.productId) ?? 0) < line.quantity)
        .map((line) => ({
          productId: line.productId,
          productTitle: line.productTitle,
          requested: line.quantity,
          available: stockById.get(line.productId) ?? 0
        }));

      if (unavailable.length > 0) {
        // Lançar o erro aqui dispara o ROLLBACK (libera os bloqueios).
        throw new HttpError(409, "Estoque insuficiente.", {
          items: unavailable
        });
      }

      // 4. Pedido, itens e pagamento simulado (sempre aprovado).
      const newOrderId = await this.orders.insertOrder(client, {
        userId,
        addressId: address.id,
        shippingAddressSnapshot: formatAddressSnapshot(address),
        status: "pago",
        totalAmount
      });

      await this.orders.insertItems(client, newOrderId, lines);

      await this.orders.insertPayment(client, {
        orderId: newOrderId,
        method: paymentMethod,
        amount: totalAmount,
        status: "aprovado"
      });

      // 4. Baixa do estoque + evento na outbox (mesma transação).
      for (const line of lines) {
        const quantityAvailable = await this.inventory.decrement(
          client,
          line.productId,
          line.quantity
        );

        const payload: InventoryChangedPayload = {
          productId: line.productId,
          quantityAvailable
        };

        await this.outbox.insert(client, {
          orderId: newOrderId,
          eventType: INVENTORY_CHANGED,
          payload
        });
      }

      return newOrderId;
    });

    // ------------------------------------------------
    // 5. REDIS: carrinho removido somente após o COMMIT
    // ------------------------------------------------
    try {
      await this.cart.clear(cartContext);
    } catch (error) {
      // O pedido já foi gravado: uma falha aqui não pode desfazê-lo.
      console.error("Pedido criado, mas o carrinho não foi limpo:", error);
    }

    return (await this.orders.findById(userId, orderId))!;
  }

  async listOrders(userId: number): Promise<Order[]> {
    return this.orders.findByUser(userId);
  }

  async getOrder(userId: number, orderId: unknown): Promise<Order> {
    const order = await this.orders.findById(userId, requireId(orderId, "id"));

    if (!order) {
      throw new HttpError(404, "Pedido não encontrado.");
    }

    return order;
  }
}
