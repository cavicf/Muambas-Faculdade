export type OutboxStatus = "pendente" | "processado" | "falhou";

export const OUTBOX_STATUSES: OutboxStatus[] = [
  "pendente",
  "processado",
  "falhou"
];

// Evento emitido quando o estoque de um produto muda.
// O processador usa o payload para atualizar o espelho no MongoDB.
export const INVENTORY_CHANGED = "inventory.changed";

export interface InventoryChangedPayload {
  productId: string;
  quantityAvailable: number;
}

export interface OutboxEventRow {
  id: number;
  order_id: number | null;
  event_type: string;
  payload: unknown;
  status: OutboxStatus;
  attempts: number;
  created_at: Date;
  processed_at: Date | null;
}

export interface OutboxEvent {
  id: number;
  orderId: number | null;
  eventType: string;
  payload: unknown;
  status: OutboxStatus;
  attempts: number;
  createdAt: string;
  processedAt: string | null;
}

export function toOutboxEvent(row: OutboxEventRow): OutboxEvent {
  return {
    id: row.id,
    orderId: row.order_id,
    eventType: row.event_type,
    payload: row.payload,
    status: row.status,
    attempts: row.attempts,
    createdAt: row.created_at.toISOString(),
    processedAt: row.processed_at?.toISOString() ?? null
  };
}
