
import "dotenv/config";

import assert from "node:assert/strict";

import {
  connectPostgres,
  disconnectPostgres,
  pgPool
} from "../../config/postgres/postgres";

import {
  connectRedis,
  disconnectRedis
} from "../../config/redis/redis";

import {
  SessionRepository,
  SESSION_TTL_SECONDS
} from "../../modules/session/redis/session.repository";

// Usuario cadastrado pelo seed do PostgreSQL.
const TEST_EMAIL = "luis@unifei.edu.br";

interface TestUser {
  id: number;
  email: string;
}

async function main() {
  try {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Este teste nao pode rodar em producao."
      );
    }

    // ======================================
    // 1. CONECTAR AOS BANCOS
    // ======================================

    await connectPostgres();

    const redis = await connectRedis();

    // ======================================
    // 2. BUSCAR USUARIO NO POSTGRESQL
    // ======================================

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
        "Usuario de teste nao encontrado."
      );
    }

    // Buscar outro usuario do seed.
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
        "O teste precisa de dois usuarios."
      );
    }

    // ======================================
    // 3. INICIALIZAR O REPOSITORY
    // ======================================

    const sessionRepository = new SessionRepository(
      redis
    );

    // ======================================
    // 4. CRIAR SESSAO DO PRIMEIRO USUARIO
    // ======================================

    const created = await sessionRepository.createSession(
      user.id
    );

    const sessionKey = `session:${created.tokenId}`;

    // Verificar o tipo do dado armazenado.
    const type = await redis.type(sessionKey);

    assert.equal(
      type,
      "string",
      "A sessao deve utilizar o tipo String."
    );

    // ======================================
    // 5. CONSULTAR A SESSAO
    // ======================================

    const session = await sessionRepository.getSession(
      created.tokenId
    );

    assert.ok(
      session,
      "A sessao deveria existir."
    );

    assert.equal(
      session.userId,
      user.id,
      "A sessao pertence ao usuario incorreto."
    );

    // ======================================
    // 6. VALIDAR O TTL
    // ======================================

    const ttl = await redis.ttl(sessionKey);

    assert.ok(
      ttl > 0 && ttl <= SESSION_TTL_SECONDS,
      `TTL invalido: ${ttl}`
    );

    // ======================================
    // 7. TESTAR OUTRO USUARIO
    // ======================================

    const second = await sessionRepository.createSession(
      otherUser.id
    );

    assert.notEqual(
      created.tokenId,
      second.tokenId,
      "Os tokens devem ser diferentes."
    );

    const secondSession = await sessionRepository.getSession(
      second.tokenId
    );

    assert.equal(
      secondSession?.userId,
      otherUser.id,
      "A segunda sessao pertence ao usuario incorreto."
    );

    // ======================================
    // 8. TESTAR TOKEN INEXISTENTE
    // ======================================

    const invalid = await sessionRepository.getSession(
      "token-inexistente"
    );

    assert.equal(
      invalid,
      null,
      "Um token invalido nao deve recuperar sessao."
    );

    // ======================================
    // 9. TESTAR REVOGACAO DA SESSAO
    // ======================================

    // Revoga somente a sessao do segundo usuario.
    const revoked = await sessionRepository.revokeSession(
      second.tokenId
    );

    assert.equal(
      revoked,
      true,
      "A sessao deveria ser removida."
    );

    const afterRevoke = await sessionRepository.getSession(
      second.tokenId
    );

    assert.equal(
      afterRevoke,
      null,
      "A sessao revogada nao pode continuar acessivel."
    );

    // A primeira sessao deve continuar existindo.
    const firstAfterRevoke =
      await sessionRepository.getSession(created.tokenId);

    assert.equal(
      firstAfterRevoke?.userId,
      user.id,
      "A revogacao afetou outra sessao."
    );

    // ======================================
    // 10. EXIBIR RESULTADOS
    // ======================================

    console.log("\nTESTE DE SESSOES REDIS");
    console.log("==========================");

    console.log("\nUSUARIO PRINCIPAL");
    console.log("--------------------------");
    console.log("Email:", user.email);
    console.log("User ID:", user.id);
    console.log("Prefixo da chave: session:");
    console.log(
      "Token (parcial):",
      `${created.tokenId.slice(0, 8)}...`
    );
    console.log("Tipo Redis:", type);
    console.log("TTL atual:", ttl, "segundos");
    console.log(
      "TTL esperado:",
      SESSION_TTL_SECONDS,
      "segundos"
    );
    console.log("Consulta da sessao: OK");

    console.log("\nSEGUNDO USUARIO");
    console.log("--------------------------");
    console.log("Email:", otherUser.email);
    console.log("User ID:", otherUser.id);
    console.log("Token independente: OK");
    console.log("Revogacao da sessao: OK");

    console.log("\nVALIDACOES");
    console.log("--------------------------");
    console.log("Token invalido: OK");
    console.log("Sessao independente: OK");
    console.log("Primeira sessao preservada: OK");

    console.log("\nRESULTADO FINAL: SUCESSO");
  } catch (error) {
    console.error(
      "Erro no teste de sessoes:",
      error
    );

    process.exitCode = 1;
  } finally {
    await Promise.allSettled([
      disconnectRedis(),
      disconnectPostgres()
    ]);
  }
}

void main();

// TODO (AUTH):
// Os usuarios sao consultados diretamente
// do seed PostgreSQL apenas para teste.
//
// Na proxima entrega, substituir este fluxo
// pelo login com validacao de credenciais.
//
// O token sera criado somente apos autenticacao.
