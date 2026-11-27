//Identificação do carrinho:
//- Usuario autenticado (req.user preenchido pelo middleware authenticate,
//  a partir de session:{tokenId} no Redis): cart:{userId}, TTL 7 dias.
//- Visitante: UUID gerado pelo backend em cookie HttpOnly,
//  cart:guest:{sessionId}, TTL 24 horas.
//
//Ninguém pode informar arbitrariamente um ID de usuário para acessar
//o carrinho de outra pessoa: o userId vem somente da sessão validada.

import { randomUUID } from "node:crypto";

import {
  Router,
  type Request,
  type Response
} from "express";

import { CartService } from "./cart.service";
import { CartError } from "./cart.types";

import {
  createGuestCartContext,
  createUserCartContext,
  type CartContext
} from "./cart.context";

// Cookie utilizado para identificar visitantes.
export const GUEST_COOKIE_NAME = "muambas_guest";

// Validade do cookie visitante: 24 horas.
const COOKIE_TTL_MS = 24 * 60 * 60 * 1000;

// path "/api" (e nao "/api/cart") para que a rota de login
// receba o cookie e consiga mesclar o carrinho visitante.
export const GUEST_COOKIE_PATH = "/api";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Le o UUID do visitante, se existir e for valido.
export function readGuestSessionId(req: Request): string | null {
  const received: unknown = req.cookies?.[GUEST_COOKIE_NAME];

  return typeof received === "string" && UUID_V4_REGEX.test(received)
    ? received
    : null;
}

// Remove o cookie visitante (apos a mesclagem no login).
// Tambem limpa o path antigo "/api/cart", usado pela versao anterior.
export function clearGuestCookie(res: Response): void {
  res.clearCookie(GUEST_COOKIE_NAME, { path: GUEST_COOKIE_PATH });
  res.clearCookie(GUEST_COOKIE_NAME, { path: "/api/cart" });
}

// Identifica o visitante por cookie HttpOnly.
//
// Caso o cookie nao exista ou seja invalido,
// o backend gera um UUID automaticamente.
//
// refresh=true renova o cookie ao alterar o carrinho.
function getGuestCartContext(
  req: Request,
  res: Response,
  refresh = false
): CartContext {
  const received = readGuestSessionId(req);

  const sessionId = received ?? randomUUID();

  if (!received || refresh) {
    res.cookie(GUEST_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_TTL_MS,
      path: GUEST_COOKIE_PATH
    });
  }

  return createGuestCartContext(sessionId);
}

// Usuario logado usa o carrinho dele; visitante, o carrinho do cookie.
export function getCartContext(
  req: Request,
  res: Response,
  refresh = false
): CartContext {
  if (req.user) {
    return createUserCartContext(req.user.id);
  }

  return getGuestCartContext(req, res, refresh);
}

// Executa as operacoes e trata os erros HTTP.
async function reply(
  res: Response,
  action: () => Promise<unknown>
): Promise<void> {
  try {
    const result = await action();

    res.json(result);
  } catch (error) {
    if (error instanceof CartError) {
      res.status(error.statusCode).json({
        error: error.message
      });

      return;
    }

    console.error("Erro ao processar carrinho:", error);

    res.status(500).json({
      error: "Erro interno ao processar carrinho."
    });
  }
}

export function createCartRoutes(
  service: CartService
) {
  const router = Router();

  // GET /api/cart
  router.get("/cart", (req, res) => {
    void reply(res, () =>
      service.getCart(getCartContext(req, res))
    );
  });

  // POST /api/cart/items
  router.post("/cart/items", (req, res) => {
    void reply(res, () =>
      service.addItem(
        getCartContext(req, res, true),
        req.body
      )
    );
  });

  // PATCH /api/cart/items/:productId
  router.patch("/cart/items/:productId", (req, res) => {
    void reply(res, () =>
      service.updateQuantity(
        getCartContext(req, res, true),
        req.params.productId,
        req.body
      )
    );
  });

  // DELETE /api/cart/items/:productId
  router.delete("/cart/items/:productId", (req, res) => {
    void reply(res, () =>
      service.removeItem(
        getCartContext(req, res, true),
        req.params.productId
      )
    );
  });

  // DELETE /api/cart
  router.delete("/cart", (req, res) => {
    void reply(res, () =>
      service.clear(getCartContext(req, res))
    );
  });

  return router;
}

// ATENCAO:
// O cookie visitante ainda nao e assinado.
// Antes de disponibilizar publicamente, revisar
// protecao CSRF, fixacao de sessao e seguranca
// dos cookies e endpoints.
