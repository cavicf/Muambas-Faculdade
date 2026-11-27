// Rotas de autenticação.
//
// POST /api/auth/register  Cadastra usuário (PostgreSQL)
// POST /api/auth/login     Valida senha, cria session:{tokenId} (Redis),
//                          envia cookie HttpOnly e mescla o carrinho visitante
// POST /api/auth/logout    Revoga a sessão e remove o cookie
// GET  /api/auth/me        Dados do usuário logado

import { Router } from "express";

import { sendResult } from "../../../shared/http";

import type { CartService } from "../../cart/redis/cart.service";
import {
  createGuestCartContext,
  createUserCartContext
} from "../../cart/redis/cart.context";
import {
  clearGuestCookie,
  readGuestSessionId
} from "../../cart/redis/cart.routes";

import type { AuthService } from "./auth.service";
import {
  requireAuth,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS
} from "./auth.middleware";

export function createAuthRoutes(auth: AuthService, cart: CartService) {
  const router = Router();

  router.post("/auth/register", (req, res) => {
    void sendResult(res, () => auth.register(req.body), {
      status: 201,
      context: "cadastro"
    });
  });

  router.post("/auth/login", (req, res) => {
    void sendResult(
      res,
      async () => {
        const { user, session } = await auth.login(req.body);

        // O token vai somente no cookie HttpOnly (JavaScript do
        // navegador não consegue lê-lo).
        res.cookie(
          SESSION_COOKIE_NAME,
          session.tokenId,
          SESSION_COOKIE_OPTIONS
        );

        // cart:guest:{sessionId} -> cart:{userId}
        let mergedCartItems = 0;
        const guestSessionId = readGuestSessionId(req);

        if (guestSessionId) {
          mergedCartItems = await cart.mergeGuestIntoUser(
            createGuestCartContext(guestSessionId),
            createUserCartContext(user.id)
          );

          clearGuestCookie(res);
        }

        return {
          user,
          expiresAt: session.session.expiresAt,
          mergedCartItems
        };
      },
      { context: "login" }
    );
  });

  router.post("/auth/logout", requireAuth, (req, res) => {
    void sendResult(
      res,
      async () => {
        await auth.logout(req.sessionTokenId!);

        res.clearCookie(SESSION_COOKIE_NAME, {
          path: SESSION_COOKIE_OPTIONS.path
        });
      },
      { context: "logout" }
    );
  });

  router.get("/auth/me", requireAuth, (req, res) => {
    void sendResult(res, () => auth.getProfile(req.user!.id), {
      context: "perfil"
    });
  });

  return router;
}
