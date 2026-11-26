//Identificação do visitante ficará em uma função dentro de cart.routes.ts
//Backend gerará automaticamente o UUID e o enviará ao navegador por um cookie HttpOnly

//As cinco rotas existentes continuam atendendo visitantes normalmente.
//Ainda não foi cirado endpoints autenticados.
//Ninguém poderá informar arbitrariamente um ID de usuário para acessar o carrinho de outra pessoa.

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
  type CartContext
} from "./cart.context";

// Cookie utilizado para identificar visitantes.
const COOKIE_NAME = "muambas_guest";

// Validade do cookie visitante: 24 horas.
const COOKIE_TTL_MS = 24 * 60 * 60 * 1000;

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const received: unknown = req.cookies?.[COOKIE_NAME];

  const valid =
    typeof received === "string" &&
    UUID_V4_REGEX.test(received);

  const sessionId = valid ? received : randomUUID();

  if (!valid || refresh) {
    res.cookie(COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_TTL_MS,
      path: "/api/cart"
    });
  }

  return createGuestCartContext(sessionId);
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
      service.getCart(getGuestCartContext(req, res))
    );
  });

  // POST /api/cart/items
  router.post("/cart/items", (req, res) => {
    void reply(res, () =>
      service.addItem(
        getGuestCartContext(req, res, true),
        req.body
      )
    );
  });

  // PATCH /api/cart/items/:productId
  router.patch("/cart/items/:productId", (req, res) => {
    void reply(res, () =>
      service.updateQuantity(
        getGuestCartContext(req, res, true),
        req.params.productId,
        req.body
      )
    );
  });

  // DELETE /api/cart/items/:productId
  router.delete("/cart/items/:productId", (req, res) => {
    void reply(res, () =>
      service.removeItem(
        getGuestCartContext(req, res, true),
        req.params.productId
      )
    );
  });

  // DELETE /api/cart
  router.delete("/cart", (req, res) => {
    void reply(res, () =>
      service.clear(getGuestCartContext(req, res))
    );
  });

  return router;
}

// TODO (AUTH):
// Atualmente estas rotas continuam atendendo
// somente visitantes.
//
// Na proxima entrega, o middleware autenticado
// identificara o usuario por token validado.
//
// Visitante: cart:guest:{sessionId}
// Autenticado: cart:{userId}
//
// Nunca permitir acesso ao carrinho autenticado
// simplesmente recebendo um userId pela requisicao.
//
// TODO (SESSOES):
// session:{tokenId} pertence ao modulo de autenticacao.
// A geracao e a validacao de tokens ficarao para
// a etapa de integracao.
//
// ATENCAO:
// O cookie visitante ainda nao e assinado.
// Antes de disponibilizar publicamente, revisar
// protecao CSRF, fixacao de sessao e seguranca
// dos cookies e endpoints.
