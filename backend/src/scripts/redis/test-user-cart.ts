//Esse script usa um usuário do seed apenas como dado de teste. Ele não simula uma autenticação real.
//Ele grava a quantidade 2 em um dos carrinhos de teste. 
//Deve ser executado somente no ambiente de desenvolvimento.

import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  connectMongo,
  disconnectMongo
} from "../../config/mongoDB/mongo";

import {
  connectPostgres,
  disconnectPostgres,
  pgPool
} from "../../config/postgres/postgres";

import {
  connectRedis,
  disconnectRedis
} from "../../config/redis/redis";

import { ProductRepository } from "../../modules/catalog/mongoDB/product.repository";

import { CatalogService } from "../../modules/catalog/mongoDB/catalog.service";

import { CartRepository } from "../../modules/cart/redis/cart.repository";

import { CartService } from "../../modules/cart/redis/cart.service";

import {
  createGuestCartContext,
  createUserCartContext,
  GUEST_CART_TTL_SECONDS,
  USER_CART_TTL_SECONDS
} from "../../modules/cart/redis/cart.context";

// Usuario cadastrado pelo seed PostgreSQL.
const TEST_EMAIL =
  process.env.REDIS_TEST_USER_EMAIL ??
  "luis@unifei.edu.br";

interface TestUser {
  id: number;
  email: string;
}

async function main() {
  try {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Este teste nao deve ser executado em producao."
      );
    }

    // ==========================================
    // 1. CONECTAR AOS TRES BANCOS
    // ==========================================

    await connectPostgres();

    const db = await connectMongo();

    const redis = await connectRedis();

    // ==========================================
    // 2. BUSCAR USUARIOS DO POSTGRESQL
    // ==========================================

    const userResult = await pgPool.query<TestUser>(
      `
      SELECT id, email
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [TEST_EMAIL]
    );

    const user = userResult.rows[0];

    if (!user) {
      throw new Error(
        `Usuario ${TEST_EMAIL} nao encontrado.`
      );
    }

    const otherResult = await pgPool.query<TestUser>(
      `
      SELECT id, email
      FROM users
      WHERE id <> $1
      ORDER BY id
      LIMIT 1
      `,
      [user.id]
    );

    const otherUser = otherResult.rows[0];

    if (!otherUser) {
      throw new Error(
        "O teste precisa de pelo menos dois usuarios."
      );
    }

    // ==========================================
    // 3. BUSCAR UM PRODUTO NO MONGODB
    // ==========================================

    const product = await db
      .collection<{ _id: string }>("products")
      .findOne(
        {},
        { projection: { _id: 1 } }
      );

    if (!product) {
      throw new Error(
        "Nenhum produto encontrado no MongoDB."
      );
    }

    // ==========================================
    // 4. INICIALIZAR O SERVICO DE CARRINHO
    // ==========================================

    const cartRepository = new CartRepository(redis);

    const catalogRepository = new ProductRepository(db);

    const catalogService = new CatalogService(
      catalogRepository
    );

    const cartService = new CartService(
      cartRepository,
      catalogService
    );

    // ==========================================
    // 5. CARRINHO DO USUARIO CADASTRADO
    // ==========================================

    const userContext = createUserCartContext(
      user.id
    );

    const otherContext = createUserCartContext(
      otherUser.id
    );

    // Guardar o estado do segundo usuario.
    const otherBefore = await cartService.getCart(
      otherContext
    );

    // Adicionar 2 unidades ao carrinho do usuario.
    const userCart = await cartService.updateQuantity(
      userContext,
      product._id,
      { quantity: 2 }
    );

    const userItem = userCart.items.find(
      item => item.productId === product._id
    );

    assert.equal(
      userItem?.quantity,
      2,
      "O carrinho do usuario deveria ter 2 unidades."
    );

    const userTTL = await redis.ttl(
      userContext.key
    );

    assert.ok(
      userTTL > 0 &&
      userTTL <= USER_CART_TTL_SECONDS,
      `TTL do usuario invalido: ${userTTL}`
    );

    assert.equal(
      await redis.type(userContext.key),
      "hash"
    );

    // ==========================================
    // 6. CARRINHO DE VISITANTE SEM LOGIN
    // ==========================================

    // Simula um visitante que ainda nao possui conta
    // ou nao realizou login.
    //
    // O UUID identifica seu carrinho temporario.
    const guestSessionId = randomUUID();

    const guestContext = createGuestCartContext(
      guestSessionId
    );

    // A chave do visitante deve ser diferente
    // da chave do usuario cadastrado.
    assert.notEqual(
      guestContext.key,
      userContext.key
    );

    // Adicionar apenas 1 unidade do mesmo produto.
    const guestCart = await cartService.updateQuantity(
      guestContext,
      product._id,
      { quantity: 1 }
    );

    const guestItem = guestCart.items.find(
      item => item.productId === product._id
    );

    assert.equal(
      guestItem?.quantity,
      1,
      "O carrinho visitante deveria ter 1 unidade."
    );

    // Verificar se o prazo e de 24 horas.
    const guestTTL = await redis.ttl(
      guestContext.key
    );

    assert.ok(
      guestTTL > 0 &&
      guestTTL <= GUEST_CART_TTL_SECONDS,
      `TTL do visitante invalido: ${guestTTL}`
    );

    // Verificar se o tipo armazenado e Hash.
    assert.equal(
      await redis.type(guestContext.key),
      "hash"
    );

    // ==========================================
    // 7. VALIDAR O ISOLAMENTO DOS CARRINHOS
    // ==========================================

    // O visitante adicionou o mesmo produto,
    // mas nao pode modificar o carrinho do usuario.
    const userCartAfter = await cartService.getCart(
      userContext
    );

    const userItemAfter = userCartAfter.items.find(
      item => item.productId === product._id
    );

    assert.equal(
      userItemAfter?.quantity,
      2,
      "O visitante alterou o carrinho do usuario."
    );

    // O carrinho do segundo usuario tambem
    // deve permanecer exatamente como estava.
    const otherAfter = await cartService.getCart(
      otherContext
    );

    assert.deepEqual(
      otherAfter,
      otherBefore,
      "O carrinho do outro usuario foi alterado."
    );

    // ==========================================
    // 8. EXIBIR OS RESULTADOS
    // ==========================================

    console.log("\nTESTE REDIS V2 CONCLUIDO");
    console.log("=========================");

    console.log("\nUSUARIO CADASTRADO");
    console.log("-------------------------");
    console.log("Email:", user.email);
    console.log("User ID:", user.id);
    console.log("Chave Redis:", userContext.key);
    console.log("Produto:", product._id);
    console.log("Quantidade:", userItem?.quantity);
    console.log("Tipo Redis: hash");
    console.log("TTL atual:", userTTL);
    console.log("TTL esperado:", USER_CART_TTL_SECONDS);
    console.log("Resultado: OK");

    console.log("\nVISITANTE SEM LOGIN");
    console.log("-------------------------");
    console.log("Session ID:", guestSessionId);
    console.log("Chave Redis:", guestContext.key);
    console.log("Produto:", product._id);
    console.log("Quantidade:", guestItem?.quantity);
    console.log("Tipo Redis: hash");
    console.log("TTL atual:", guestTTL);
    console.log("TTL esperado:", GUEST_CART_TTL_SECONDS);
    console.log("Resultado: OK");

    console.log("\nISOLAMENTO");
    console.log("-------------------------");
    console.log("Carrinhos independentes: OK");
    console.log("Segundo usuario preservado: OK");

    console.log("\nRESULTADO FINAL: SUCESSO");
  } catch (error) {
    console.error("Erro no teste Redis V2:", error);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([
      disconnectRedis(),
      disconnectMongo(),
      disconnectPostgres()
    ]);
  }
}

void main();
