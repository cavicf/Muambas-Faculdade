// Rotas de pedidos (todas exigem login).
//
// POST /api/orders/checkout   Finaliza a compra do carrinho
//                             { addressId, paymentMethod }
// GET  /api/orders            "Meus pedidos"
// GET  /api/orders/:id        Detalhe de um pedido

import { Router } from "express";

import { sendResult } from "../../../shared/http";
import { requireAuth } from "../../auth/postgres/auth.middleware";
import { createUserCartContext } from "../../cart/redis/cart.context";

import type { OrderService } from "./order.service";

export function createOrderRoutes(service: OrderService) {
  const router = Router();

  router.use("/orders", requireAuth);

  router.post("/orders/checkout", (req, res) => {
    void sendResult(
      res,
      () =>
        service.checkout(
          req.user!.id,
          createUserCartContext(req.user!.id),
          req.body
        ),
      { status: 201, context: "checkout" }
    );
  });

  router.get("/orders", (req, res) => {
    void sendResult(res, () => service.listOrders(req.user!.id), {
      context: "pedidos"
    });
  });

  router.get("/orders/:id", (req, res) => {
    void sendResult(res, () => service.getOrder(req.user!.id, req.params.id), {
      context: "pedido"
    });
  });

  return router;
}
