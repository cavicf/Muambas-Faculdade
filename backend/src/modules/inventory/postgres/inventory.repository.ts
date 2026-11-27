// Operações da tabela inventory.
//
// Método            SQL                                   Uso
// findByIds()       SELECT ... WHERE product_id = ANY($1)  Consulta
// lockForUpdate()   SELECT ... FOR UPDATE                  Checkout (bloqueio)
// decrement()       UPDATE ... SET quantity - n            Checkout (baixa)
// insertMissing()   INSERT ... ON CONFLICT DO NOTHING      Seed

import { pgPool, type PgExecutor } from "../../../config/postgres/postgres";

import type { InventoryRow } from "./inventory.types";

const INVENTORY_COLUMNS = "product_id, quantity_available, updated_at";

export class InventoryRepository {
  constructor(private readonly db: PgExecutor = pgPool) {}

  async findByIds(productIds: string[]): Promise<InventoryRow[]> {
    const { rows } = await this.db.query<InventoryRow>(
      `SELECT ${INVENTORY_COLUMNS} FROM inventory
       WHERE product_id = ANY($1::varchar[])
       ORDER BY product_id`,
      [productIds]
    );

    return rows;
  }

  // Bloqueia as linhas de estoque até o fim da transação.
  //
  // Outro checkout que tente comprar os mesmos produtos espera aqui
  // até este terminar (COMMIT/ROLLBACK). É isso que impede dois
  // clientes de comprarem a última unidade ao mesmo tempo.
  //
  // ORDER BY product_id: todas as transações bloqueiam na mesma
  // ordem, o que evita deadlock entre checkouts simultâneos.
  async lockForUpdate(
    client: PgExecutor,
    productIds: string[]
  ): Promise<InventoryRow[]> {
    const { rows } = await client.query<InventoryRow>(
      `SELECT ${INVENTORY_COLUMNS} FROM inventory
       WHERE product_id = ANY($1::varchar[])
       ORDER BY product_id
       FOR UPDATE`,
      [productIds]
    );

    return rows;
  }

  // Baixa o estoque e devolve a nova quantidade.
  // O CHECK (quantity_available >= 0) do schema é a última barreira.
  async decrement(
    client: PgExecutor,
    productId: string,
    quantity: number
  ): Promise<number> {
    const { rows } = await client.query<{ quantity_available: number }>(
      `UPDATE inventory
       SET quantity_available = quantity_available - $2
       WHERE product_id = $1
       RETURNING quantity_available`,
      [productId, quantity]
    );

    return rows[0].quantity_available;
  }

  // Cria o estoque apenas dos produtos que ainda não têm linha.
  // Nunca sobrescreve quantidades que já mudaram com as vendas.
  async insertMissing(
    items: { productId: string; quantity: number }[]
  ): Promise<number> {
    if (items.length === 0) {
      return 0;
    }

    const { rowCount } = await this.db.query(
      `INSERT INTO inventory (product_id, quantity_available)
       SELECT * FROM UNNEST($1::varchar[], $2::int[])
       ON CONFLICT (product_id) DO NOTHING`,
      [items.map((item) => item.productId), items.map((item) => item.quantity)]
    );

    return rowCount ?? 0;
  }
}
