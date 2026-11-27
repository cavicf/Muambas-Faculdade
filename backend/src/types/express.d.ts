// Acrescenta o usuário autenticado ao Request do Express.
//
// Preenchido pelo middleware de autenticação a partir de uma
// sessão válida no Redis (session:{tokenId}). Nunca a partir
// de um userId enviado pelo navegador.

import type { AuthenticatedUser } from "../modules/auth/postgres/user.types";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionTokenId?: string;
    }
  }
}

export {};
