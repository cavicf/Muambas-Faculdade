//Identificação do visitante ficará em uma função dentro de cart.routes.ts
//Backend gerará automaticamente o UUID e o enviará ao navegador por um cookie HttpOnly

import { randomUUID } from "node:crypto";

import {
  Router,
  type Request,
  type Response
} from "express";

import { CartService } from "./cart.service";
import { CartError } from "./cart.types";

// Nome do cookie utilizado para identificar visitantes.
const COOKIE_NAME = "muambas_guest";

// Prazo do cookie: 24 horas em milissegundos.
const COOKIE_TTL_MS = 24 * 60 * 60 * 1000;

// Verifica o formato de UUID versão 4.
// Impede o uso de strings arbitrárias como chave Redis.
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Identifica o carrinho do visitante.
//
// Se o navegador não possuir um cookie válido,
// o backend gera automaticamente um novo UUID.
//
// refresh=true renova o prazo do cookie após
// uma tentativa de alteração do carrinho.
function getGuestCartKey(
  req: Request,
  res: Response,
  refresh = false
): string {
  // Lê o cookie recebido do navegador.
  const received: unknown = req.cookies?.[COOKIE_NAME];

  // Confirma se o identificador recebido possui formato válido.
  const valid =
    typeof received === "string" &&
    UUID_V4_REGEX.test(received);

  // Reutiliza o UUID existente ou gera um novo.
  const sessionId = valid ? received : randomUUID();

  // Cria ou renova o cookie.
  if (!valid || refresh) {
    res.cookie(COOKIE_NAME, sessionId, {
      // Impede leitura do cookie por JavaScript no navegador.
      httpOnly: true,

      // Proteção básica contra envio cross-site.
      sameSite: "lax",

      // Exige HTTPS em produção.
      secure: process.env.NODE_ENV === "production",

      // Validade do cookie.
      maxAge: COOKIE_TTL_MS,

      // Envia o cookie somente às rotas do carrinho.
      path: "/api/cart"
    });
  }

  // Retorna a chave utilizada para armazenar o carrinho.
  return `cart:guest:${sessionId}`;
}

// Executa a operação e transforma erros em respostas HTTP.
async function reply(
  res: Response,
  action: () => Promise<unknown>
): Promise<void> {
  try {
    const result = await action();

    res.json(result);
  } catch (error) {
    // Erros esperados: validação e produto inexistente.
    if (error instanceof CartError) {
      res.status(error.statusCode).json({
        error: error.message
      });

      return;
    }

    // Erros inesperados: problemas de banco ou servidor.
    console.error("Erro ao processar carrinho:", error);

    res.status(500).json({
      error: "Erro interno ao processar carrinho."
    });
  }
}

// Cria as rotas REST do módulo de carrinho.
export function createCartRoutes(service: CartService) {
  const router = Router();

  // GET /api/cart
  // Consulta os itens do carrinho do visitante.
  router.get("/cart", (req, res) => {
    void reply(res, () =>
      service.getCart(getGuestCartKey(req, res))
    );
  });

  // POST /api/cart/items
  // Adiciona unidades de um produto ao carrinho.
  router.post("/cart/items", (req, res) => {
    void reply(res, () =>
      service.addItem(
        getGuestCartKey(req, res, true),
        req.body
      )
    );
  });

  // PATCH /api/cart/items/:productId
  // Define a quantidade total de um produto.
  router.patch("/cart/items/:productId", (req, res) => {
    void reply(res, () =>
      service.updateQuantity(
        getGuestCartKey(req, res, true),
        req.params.productId,
        req.body
      )
    );
  });

  // DELETE /api/cart/items/:productId
  // Remove somente o produto indicado.
  router.delete("/cart/items/:productId", (req, res) => {
    void reply(res, () =>
      service.removeItem(
        getGuestCartKey(req, res, true),
        req.params.productId
      )
    );
  });

  // DELETE /api/cart
  // Esvazia completamente o carrinho.
  router.delete("/cart", (req, res) => {
    void reply(res, () =>
      service.clear(getGuestCartKey(req, res))
    );
  });

  return router;
}

// TODO (AUTENTICACAO):
// Quando existir autenticação real, implementar
// um middleware que identifique o usuário pelo login.
//
// Visitante:
// cart:guest:{sessionId}
//
// Usuário autenticado:
// cart:{userId}
//
// Nunca confiar diretamente em um userId informado
// pelo frontend como prova de autenticação.
//
// TODO (SESSOES):
// session:{tokenId} deverá ser implementado somente
// se o módulo de autenticação adotar sessões Redis.
//
// ATENCAO:
// O cookie visitante atual não é assinado.
// Seu UUID funciona como uma credencial de acesso
// ao carrinho, portanto deve permanecer imprevisível.
//
// Antes de uma implantação pública, avaliar assinatura
// de cookies, prevenção contra fixação de sessão,
// proteção CSRF e demais controles de segurança.
