// Rotas dos endereços (todas exigem login).
//
// GET    /api/addresses       Lista os endereços do usuário
// POST   /api/addresses       Cadastra um endereço
// PUT    /api/addresses/:id   Substitui os dados de um endereço
// DELETE /api/addresses/:id   Remove (se não foi usado em pedido)

import { Router } from "express";

import { sendResult } from "../../../shared/http";
import { requireAuth } from "../../auth/postgres/auth.middleware";

import type { AddressService } from "./address.service";

export function createAddressRoutes(service: AddressService) {
  const router = Router();

  router.use("/addresses", requireAuth);

  router.get("/addresses", (req, res) => {
    void sendResult(res, () => service.list(req.user!.id), {
      context: "endereços"
    });
  });

  router.post("/addresses", (req, res) => {
    void sendResult(res, () => service.create(req.user!.id, req.body), {
      status: 201,
      context: "endereço"
    });
  });

  router.put("/addresses/:id", (req, res) => {
    void sendResult(
      res,
      () => service.update(req.user!.id, req.params.id, req.body),
      { context: "endereço" }
    );
  });

  router.delete("/addresses/:id", (req, res) => {
    void sendResult(res, () => service.delete(req.user!.id, req.params.id), {
      context: "endereço"
    });
  });

  return router;
}
