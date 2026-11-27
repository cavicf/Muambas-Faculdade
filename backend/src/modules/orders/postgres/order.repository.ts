// Operações das tabelas orders, order_items e payments.
//
// As inserções recebem o cliente da transação do checkout;
// as consultas usam o pool.

import { pgPool, type PgExecutor } from "../../../config/postgres/postgres";

import type {
  CheckoutLine,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus
} from "./order.types";

// Monta o pedido com itens e pagamentos em uma única consulta,
// já no formato da API (json_build_object / json_agg).
const ORDER_SELECT = `
  SELECT
    o.id,
    o.status,
    o.total_amount::float8 AS "totalAmount",
    o.address_id AS "addressId",
    o.shipping_address_snapshot AS "shippingAddressSnapshot",
    to_char(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt",
    to_char(o.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "updatedAt",
    COALESCE((
      SELECT json_agg(json_build_object(
        'id', i.id,
        'productId', i.product_id,
        'productTitle', i.product_title,
        'unitPrice', i.unit_price::float8,
        'quantity', i.quantity,
        'subtotal', i.subtotal::float8
      ) ORDER BY i.id)
      FROM order_items i WHERE i.order_id = o.id
    ), '[]') AS items,
    COALESCE((
      SELECT json_agg(json_build_object(
        'id', p.id,
        'method', p.method,
        'amount', p.amount::float8,
        'status', p.status,
        'createdAt', to_char(p.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ) ORDER BY p.id)
      FROM payments p WHERE p.order_id = o.id
    ), '[]') AS payments
  FROM orders o
`;

export class OrderRepository {
  constructor(private readonly db: PgExecutor = pgPool) {}

  // ==============================================
  // ESCRITA (dentro da transação do checkout)
  // ==============================================

  async insertOrder(
    client: PgExecutor,
    order: {
      userId: number;
      addressId: number;
      shippingAddressSnapshot: string;
      status: OrderStatus;
      totalAmount: number;
      createdAt?: Date;
    }
  ): Promise<number> {
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO orders
         (user_id, address_id, shipping_address_snapshot, status, total_amount,
          created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()), COALESCE($6, NOW()))
       RETURNING id`,
      [
        order.userId,
        order.addressId,
        order.shippingAddressSnapshot,
        order.status,
        order.totalAmount,
        order.createdAt ?? null
      ]
    );

    return rows[0].id;
  }

  // subtotal não é enviado: é calculado pelo próprio PostgreSQL.
  async insertItems(
    client: PgExecutor,
    orderId: number,
    lines: CheckoutLine[]
  ): Promise<void> {
    await client.query(
      `INSERT INTO order_items (order_id, product_id, product_title, unit_price, quantity)
       SELECT $1, * FROM UNNEST($2::varchar[], $3::varchar[], $4::numeric[], $5::int[])`,
      [
        orderId,
        lines.map((line) => line.productId),
        lines.map((line) => line.productTitle),
        lines.map((line) => line.unitPrice),
        lines.map((line) => line.quantity)
      ]
    );
  }

  async insertPayment(
    client: PgExecutor,
    payment: {
      orderId: number;
      method: PaymentMethod;
      amount: number;
      status: PaymentStatus;
      createdAt?: Date;
    }
  ): Promise<void> {
    await client.query(
      `INSERT INTO payments (order_id, method, amount, status, created_at)
       VALUES ($1, $2, $3, $4, COALESCE($5, NOW()))`,
      [
        payment.orderId,
        payment.method,
        payment.amount,
        payment.status,
        payment.createdAt ?? null
      ]
    );
  }

  // ==============================================
  // CONSULTA ("Meus pedidos")
  // ==============================================

  async findByUser(userId: number): Promise<Order[]> {
    const { rows } = await this.db.query<Order>(
      `${ORDER_SELECT} WHERE o.user_id = $1 ORDER BY o.created_at DESC, o.id DESC`,
      [userId]
    );

    return rows;
  }

  async findById(userId: number, orderId: number): Promise<Order | null> {
    const { rows } = await this.db.query<Order>(
      `${ORDER_SELECT} WHERE o.user_id = $1 AND o.id = $2`,
      [userId, orderId]
    );

    return rows[0] ?? null;
  }

  async countByUser(userId: number): Promise<number> {
    const { rows } = await this.db.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM orders WHERE user_id = $1",
      [userId]
    );

    return rows[0].count;
  }
}
