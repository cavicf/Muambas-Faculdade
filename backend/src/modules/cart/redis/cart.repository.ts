//arquivo implementa as operações do banco de dados:

//Método	    Comando Redis	        Objetivo
//getItems()	HGETALL	                Consultar itens
//addItem()	    EVAL com HSET e EXPIRE	Somar quantidades com limite
//setQuantity()	HSET	                Alterar quantidade
//removeItem()	HDEL	                Remover produto
//clear()	    DEL	                    Esvaziar carrinho


import type { RedisConnection } from "../../../config/redis/redis";
import type { CartItem } from "./cart.types";
import type { CartContext } from "./cart.context";

export class CartRepository {
  constructor(
    private readonly redis: RedisConnection
  ) {}

  // Recupera todos os itens do carrinho.
  // O Redis utiliza um Hash: productId -> quantity.
  async getItems(
    context: CartContext
  ): Promise<CartItem[]> {
    const hash = await this.redis.hGetAll(context.key);

    return Object.entries(hash).map(
      ([productId, value]) => ({
        productId,
        quantity: Number(value)
      })
    );
  }

  // Adiciona unidades de um produto ao carrinho.
  //
  // O script Lua garante que a verificacao e a soma
  // sejam atomicas, respeitando o limite de 99 unidades.
  //
  // O TTL e definido pelo tipo de carrinho:
  // visitante: 24 horas
  // usuario: 7 dias
  async addItem(
    context: CartContext,
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
      keys: [context.key],
      arguments: [
        productId,
        String(quantity),
        String(context.ttlSeconds)
      ]
    });

    return result === 1;
  }

  // Substitui a quantidade de um produto.
  // Tambem renova a validade do carrinho.
  async setQuantity(
    context: CartContext,
    productId: string,
    quantity: number
  ): Promise<void> {
    await this.redis
      .multi()
      .hSet(context.key, productId, String(quantity))
      .expire(context.key, context.ttlSeconds) //o tempo para expirar é recebido pelo contexto
      .exec();
  }

  // Remove um produto especifico.
  // Se o Hash continuar existindo, renova seu TTL.
  async removeItem(
    context: CartContext,
    productId: string
  ): Promise<void> {
    await this.redis
      .multi()
      .hDel(context.key, productId)
      .expire(context.key, context.ttlSeconds)
      .exec();
  }

  // Esvazia o carrinho e remove sua chave do Redis.
  async clear(
    context: CartContext
  ): Promise<void> {
    await this.redis.del(context.key);
  }
}
