//Define o formato dos dados que serão armazenados no Redis.

/**
 * Dados armazenados no Redis para uma sessao.
 *
 * A sessao identifica um usuario cadastrado
 * no PostgreSQL por meio de seu userId.
 */
export interface SessionData {
  userId: number;
  createdAt: string;
  expiresAt: string;
}

/**
 * Resultado da criacao de uma nova sessao.
 *
 * tokenId e um identificador secreto gerado
 * aleatoriamente pelo backend.
 */
export interface CreatedSession {
  tokenId: string;
  session: SessionData;
}

// TODO (INTEGRACAO AUTH):
// Na proxima entrega, os dados da sessao
// serao utilizados pelo middleware de autenticacao.
//
// O token devera ser entregue ao navegador
// somente depois de um login validado.
