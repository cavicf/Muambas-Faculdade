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

  // Mescla o carrinho de origem (visitante) no de destino (usuário).
  //
  // Executado de forma atômica por script Lua:
  // - soma as quantidades de cada produto, respeitando o limite de 99;
  // - renova o TTL do carrinho de destino;
  // - apaga o carrinho de origem.
  //
  // Retorna quantos produtos diferentes foram mesclados.
  async merge(
    source: CartContext,
    target: CartContext
  ): Promise<number> {
    const script = `
      local items = redis.call("HGETALL", KEYS[1])

      if #items == 0 then
        return 0
      end

      for i = 1, #items, 2 do
        local current = tonumber(redis.call("HGET", KEYS[2], items[i]) or "0")
        local total = math.min(99, current + tonumber(items[i + 1]))

        redis.call("HSET", KEYS[2], items[i], total)
      end

      redis.call("EXPIRE", KEYS[2], tonumber(ARGV[1]))
      redis.call("DEL", KEYS[1])

      return #items / 2
    `;

    const result = await this.redis.eval(script, {
      keys: [source.key, target.key],
      arguments: [String(target.ttlSeconds)]
    });

    return Number(result);
  }

  // Esvazia o carrinho e remove sua chave do Redis.
  async clear(
    context: CartContext
  ): Promise<void> {
    await this.redis.del(context.key);
  }
}
