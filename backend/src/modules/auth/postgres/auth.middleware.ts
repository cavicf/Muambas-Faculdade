// Middlewares de autenticação.
//
// authenticate: lê o cookie de sessão e, se a sessão existir no
//               Redis, preenche req.user. Nunca bloqueia a requisição
//               (o carrinho, por exemplo, também atende visitantes).
//
// requireAuth:  bloqueia com 401 quando não há usuário autenticado.

import type { NextFunction, Request, Response } from "express";

import {
  SESSION_TTL_SECONDS,
  type SessionRepository
} from "../../session/redis/session.repository";

// Cookie HttpOnly com o tokenId da sessão.
export const SESSION_COOKIE_NAME = "muambas_session";

// Opções do cookie. path "/api" faz o navegador enviá-lo
// para todas as rotas da API (carrinho, pedidos, endereços...).
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_TTL_SECONDS * 1000,
  path: "/api"
};

export function createAuthenticate(sessions: SessionRepository) {
  return async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const tokenId: unknown = req.cookies?.[SESSION_COOKIE_NAME];

    if (typeof tokenId !== "string" || !tokenId) {
      next();
      return;
    }

    try {
      const session = await sessions.getSession(tokenId);

      if (session) {
        req.user = { id: session.userId };
        req.sessionTokenId = tokenId;
      } else {
        // Sessão expirada ou revogada: remove o cookie inútil.
        res.clearCookie(SESSION_COOKIE_NAME, {
          path: SESSION_COOKIE_OPTIONS.path
        });
      }
    } catch (error) {
      // Sessão corrompida não derruba a requisição: segue como visitante.
      console.error("Erro ao validar sessão:", error);
    }

    next();
  };
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "Faça login para continuar." });
    return;
  }

  next();
}
