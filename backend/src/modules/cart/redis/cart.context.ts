
//Cada contexto já informa a chave e o TTL corretos.
//Não queremos que o repositório Redis precise descobrir se o 
// carrinho pertence a um visitante ou a um usuário cadastrado.

export interface CartContext {
  readonly key: string;
  readonly ttlSeconds: number;
}

// Carrinho visitante: 24 horas.
export const GUEST_CART_TTL_SECONDS = 24 * 60 * 60;

// Carrinho de usuario cadastrado: 7 dias.
export const USER_CART_TTL_SECONDS = 7 * 24 * 60 * 60;

// Contexto do carrinho visitante.
// O UUID e validado na rota antes de chegar aqui.
export function createGuestCartContext(
  sessionId: string
): CartContext {
  return {
    key: `cart:guest:${sessionId}`,
    ttlSeconds: GUEST_CART_TTL_SECONDS
  };
}

// Contexto do carrinho associado ao usuario do PostgreSQL.
export function createUserCartContext(
  userId: number
): CartContext {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("ID de usuario invalido.");
  }

  return {
    key: `cart:${userId}`,
    ttlSeconds: USER_CART_TTL_SECONDS
  };
}

// TODO (AUTH):
// O userId devera vir exclusivamente de uma sessao
// autenticada e validada pelo backend.
//
// Nunca utilizar um userId fornecido livremente
// pelo navegador para liberar acesso ao carrinho.
