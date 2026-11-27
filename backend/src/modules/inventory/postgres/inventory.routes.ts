// Rotas de consulta de estoque (públicas).
//
// GET  /api/inventory/:productId   Estoque de um produto
// POST /api/inventory/batch        Estoque de vários produtos { ids: [...] }

import { Router } from "express";

import { sendResult } from "../../../shared/http";

import type { InventoryService } from "./inventory.service";

export function createInventoryRoutes(service: InventoryService) {
  const router = Router();

  router.post("/inventory/batch", (req, res) => {
    void sendResult(res, () => service.getStocks(req.body?.ids), {
      context: "estoque"
    });
  });

  router.get("/inventory/:productId", (req, res) => {
    void sendResult(res, () => service.getStock(req.params.productId), {
      context: "estoque"
    });
  });

  return router;
}
