// Processador da outbox: PostgreSQL -> MongoDB.
//
// Consistência eventual (Seção 5 do relatório): o checkout grava
// eventos em outbox_events na mesma transação do pedido; este
// processo lê os pendentes periodicamente e atualiza o espelho
// availabilityStatus no catálogo do MongoDB.
//
// Se o MongoDB estiver fora do ar, o evento continua "pendente" e
// é tentado de novo no próximo ciclo; após MAX_ATTEMPTS, "falhou".
// Assim nenhuma atualização de estoque se perde.

import { withTransaction } from "../../config/postgres/postgres";

import type { ProductRepository } from "../catalog/mongoDB/product.repository";

import type { OutboxRepository } from "./postgres/outbox.repository";
import {
  INVENTORY_CHANGED,
  type InventoryChangedPayload,
  type OutboxEventRow
} from "./postgres/outbox.types";

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;

export interface ProcessResult {
  processed: number;
  failed: number;
}

export class OutboxProcessor {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly products: ProductRepository
  ) {}

  // Aplica um evento no MongoDB. Lança erro se não for possível.
  private async apply(event: OutboxEventRow): Promise<void> {
    if (event.event_type !== INVENTORY_CHANGED) {
      throw new Error(`Tipo de evento desconhecido: ${event.event_type}`);
    }

    const { productId, quantityAvailable } =
      event.payload as InventoryChangedPayload;

    const found = await this.products.updateAvailability(
      productId,
      quantityAvailable > 0 ? "Em estoque" : "Esgotado"
    );

    if (!found) {
      throw new Error(`Produto ${productId} não encontrado no MongoDB.`);
    }
  }

  // Processa um lote de eventos pendentes.
  // Também usado pela rota POST /api/outbox/process.
  async processPending(): Promise<ProcessResult> {
    // Evita dois ciclos ao mesmo tempo neste processo.
    if (this.running) {
      return { processed: 0, failed: 0 };
    }

    this.running = true;

    try {
      return await withTransaction(async (client) => {
        const events = await this.outbox.claimPending(client, BATCH_SIZE);
        const result: ProcessResult = { processed: 0, failed: 0 };

        for (const event of events) {
          try {
            await this.apply(event);
            await this.outbox.markProcessed(client, event.id);
            result.processed++;
          } catch (error) {
            console.error(`Outbox: falha no evento ${event.id}:`, error);
            await this.outbox.markFailure(client, event.id, MAX_ATTEMPTS);
            result.failed++;
          }
        }

        if (events.length > 0) {
          console.log(
            `Outbox: ${result.processed} processado(s), ${result.failed} com falha.`
          );
        }

        return result;
      });
    } finally {
      this.running = false;
    }
  }

  start(intervalMs: number): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.processPending().catch((error) => {
        console.error("Outbox: erro no ciclo de processamento:", error);
      });
    }, intervalMs);

    console.log(`Processador da outbox ativo (a cada ${intervalMs / 1000}s).`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
