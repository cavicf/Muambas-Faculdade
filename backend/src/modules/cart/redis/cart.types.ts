
// Representa um produto armazenado no carrinho.
//
// O Redis guarda apenas o identificador do produto
// e a quantidade solicitada pelo visitante.
//
// Os dados completos do produto continuam no MongoDB.
export interface CartItem {
  productId: string;
  quantity: number;
}

// Representa a resposta enviada pela API do carrinho.
export interface CartResponse {
  items: CartItem[];
  totalItems: number;
}

// Erro utilizado para informar problemas esperados,
// como quantidades inválidas ou produtos inexistentes.
export class CartError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "CartError";
  }
}
