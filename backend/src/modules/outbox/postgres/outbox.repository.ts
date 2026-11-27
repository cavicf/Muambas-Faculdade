// Operações da tabela outbox_events.
//
// Método           Uso
// insert()         Checkout grava o evento NA MESMA transação do pedido
// claimPending()   Processador pega um lote (FOR UPDATE SKIP LOCKED)
// markProcessed()  Evento aplicado no MongoDB
// markFailure()    Erro ao aplicar: soma tentativa ou marca "falhou"
// list()           Consulta (rota de acompanhamento)

import { pgPool, type PgExecutor } from "../../../config/postgres/postgres";

import type { OutboxEventRow, OutboxStatus } from "./outbox.types";

const OUTBOX_COLUMNS =
  "id, order_id, event_type, payload, status, attempts, created_at, processed_at";

export class OutboxRepository {
  constructor(private readonly db: PgExecutor = pgPool) {}

  async insert(
    client: PgExecutor,
    event: { orderId: number | null; eventType: string; payload: unknown }
  ): Promise<void> {
    await client.query(
      `INSERT INTO outbox_events (order_id, event_type, payload)
       VALUES ($1, $2, $3)`,
      [event.orderId, event.eventType, JSON.stringify(event.payload)]
    );
  }

  // SKIP LOCKED: se houver mais de um processador rodando, cada um
  // pega eventos diferentes, sem esperar e sem processar em dobro.
  async claimPending(
    client: PgExecutor,
    limit: number
  ): Promise<OutboxEventRow[]> {
    const { rows } = await client.query<OutboxEventRow>(
      `SELECT ${OUTBOX_COLUMNS} FROM outbox_events
       WHERE status = 'pendente'
       ORDER BY created_at, id
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit]
    );

    return rows;
  }

  async markProcessed(client: PgExecutor, id: number): Promise<void> {
    await client.query(
      `UPDATE outbox_events
       SET status = 'processado', attempts = attempts + 1, processed_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  // Depois de maxAttempts tentativas, o evento para de ser reprocessado.
  async markFailure(
    client: PgExecutor,
    id: number,
    maxAttempts: number
  ): Promise<void> {
    await client.query(
      `UPDATE outbox_events
       SET attempts = attempts + 1,
           status = CASE WHEN attempts + 1 >= $2 THEN 'falhou' ELSE 'pendente' END
       WHERE id = $1`,
      [id, maxAttempts]
    );
  }

  async list(filters: {
    status?: OutboxStatus;
    limit: number;
  }): Promise<OutboxEventRow[]> {
    const { rows } = await this.db.query<OutboxEventRow>(
      `SELECT ${OUTBOX_COLUMNS} FROM outbox_events
       WHERE ($1::varchar IS NULL OR status = $1)
       ORDER BY id DESC
       LIMIT $2`,
      [filters.status ?? null, filters.limit]
    );

    return rows;
  }
}
