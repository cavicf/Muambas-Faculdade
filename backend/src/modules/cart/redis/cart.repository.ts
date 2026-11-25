//arquivo implementa as operações do banco de dados:

//Método	    Comando Redis	        Objetivo
//getItems()	HGETALL	                Consultar itens
//addItem()	    EVAL com HSET e EXPIRE	Somar quantidades com limite
//setQuantity()	HSET	                Alterar quantidade
//removeItem()	HDEL	                Remover produto
//clear()	    DEL	                    Esvaziar carrinho

import type { RedisConnection } from "../../../config/redis/redis";
import type { CartItem } from "./cart.types";

// Prazo de validade do carrinho de visitantes: 24 horas.
export const GUEST_CART_TTL_SECONDS = 24 * 60 * 60;

export class CartRepository {
  constructor(private readonly redis: RedisConnection) {}

  // Recupera todos os itens de um carrinho.
  //
  // Cada carrinho é armazenado como um HASH:
  // productId -> quantity
  async getItems(key: string): Promise<CartItem[]> {
    const hash = await this.redis.hGetAll(key);

    return Object.entries(hash).map(([productId, value]) => ({
      productId,
      quantity: Number(value)
    }));
  }

  // Adiciona unidades de um produto ao carrinho.
  //
  // O script Lua executa a verificação e o incremento
  // de maneira atômica, evitando que requisições
  // simultâneas ultrapassem o limite de 99 unidades.
  //
  // Também renova o TTL do carrinho para 24 horas.
  async addItem(
    key: string,
    productId: string,
    quantity: number
  ): Promise<boolean> {
    const script = `
      local current = tonumber(
        redis.call("HGET", KEYS[1], ARGV[1]) or "0"
      )

      local newQuantity = current + tonumber(ARGV[2])

      if newQuantity > 99 then
        return 0
      end

      redis.call("HSET", KEYS[1], ARGV[1], newQuantity)
      redis.call("EXPIRE", KEYS[1], tonumber(ARGV[3]))

      return 1
    `;

    const result = await this.redis.eval(script, {
      keys: [key],
      arguments: [
        productId,
        String(quantity),
        String(GUEST_CART_TTL_SECONDS)
      ]
    });

    return result === 1;
  }

  // Define uma quantidade absoluta para o produto.
  //
  // Diferentemente da adição, esta operação substitui
  // a quantidade anteriormente armazenada.
  async setQuantity(
    key: string,
    productId: string,
    quantity: number
  ): Promise<void> {
    await this.redis
      .multi()
      .hSet(key, productId, String(quantity))
      .expire(key, GUEST_CART_TTL_SECONDS)
      .exec();
  }

  // Remove somente o produto indicado do carrinho.
  async removeItem(
    key: string,
    productId: string
  ): Promise<void> {
    await this.redis
      .multi()
      .hDel(key, productId)
      .expire(key, GUEST_CART_TTL_SECONDS)
      .exec();
  }

  // Remove todos os itens, excluindo a chave do Redis.
  async clear(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

// TODO (AUTENTICACAO):
// Quando existir autenticação real, implementar suporte
// à chave cart:{userId}, com TTL de 7 dias.
//
// Atualmente, todas as operações trabalham com
// carrinhos de visitantes, que possuem TTL de 24 horas.
