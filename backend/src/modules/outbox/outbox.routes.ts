// Rotas de acompanhamento da outbox (apoio a testes e à apresentação).
//
// GET  /api/outbox/events?status=pendente|processado|falhou&limit=50
// POST /api/outbox/process   Executa um ciclo do processador agora,
//                            sem esperar o intervalo automático
//
// ATENÇÃO: rotas de desenvolvimento. Em produção ficariam restritas
// a administradores.

import { Router } from "express";

import { HttpError, sendResult } from "../../shared/http";

import type { OutboxProcessor } from "./outbox.processor";
import type { OutboxRepository } from "./postgres/outbox.repository";
import {
  OUTBOX_STATUSES,
  toOutboxEvent,
  type OutboxStatus
} from "./postgres/outbox.types";

export function createOutboxRoutes(
  repository: OutboxRepository,
  processor: OutboxProcessor
) {
  const router = Router();

  router.get("/outbox/events", (req, res) => {
    void sendResult(
      res,
      async () => {
        const { status, limit } = req.query;

        if (
          status !== undefined &&
          !OUTBOX_STATUSES.includes(status as OutboxStatus)
        ) {
          throw new HttpError(
            400,
            `status deve ser: ${OUTBOX_STATUSES.join(", ")}.`
          );
        }

        const parsedLimit = limit === undefined ? 50 : Number(limit);

        if (
          !Number.isInteger(parsedLimit) ||
          parsedLimit < 1 ||
          parsedLimit > 200
        ) {
          throw new HttpError(400, "limit deve ser um inteiro entre 1 e 200.");
        }

        const rows = await repository.list({
          status: status as OutboxStatus | undefined,
          limit: parsedLimit
        });

        return rows.map(toOutboxEvent);
      },
      { context: "outbox" }
    );
  });

  router.post("/outbox/process", (req, res) => {
    void sendResult(res, () => processor.processPending(), {
      context: "outbox"
    });
  });

  return router;
}
