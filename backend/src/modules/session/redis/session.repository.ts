//Responsável pelas operações do Redis
//Método	        Comando Redis	    Função
//createSession()	SET ... EX ... NX	Cria a sessão com TTL
//getSession()	    GET	                Recupera os dados da sessão
//revokeSession()	DEL	                Encerra a sessão antecipadamente

//O Redis eliminará a chave automaticamente depois de 86.400 segundos.
//A criação utiliza randomBytes(32), gerando um identificador de 256 bits. 
//Assim, mesmo nessa versão inicial, não precisamos usar o ID previsível do usuário como token.

import { randomBytes } from "node:crypto";

import type { RedisConnection } from "../../../config/redis/redis";

import type {
  CreatedSession,
  SessionData
} from "./session.types";

// Validade inicial de uma sessao: 24 horas.
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

// Um token de 32 bytes convertido em hexadecimal
// possui 64 caracteres.
const TOKEN_ID_REGEX = /^[a-f0-9]{64}$/;

export class SessionRepository {
  constructor(
    private readonly redis: RedisConnection
  ) {}

  /**
   * Monta a chave utilizada pelo Redis.
   */
  private getKey(tokenId: string): string {
    return `session:${tokenId}`;
  }

  /**
   * Cria uma nova sessao.
   *
   * O token e gerado com 32 bytes aleatorios
   * criptograficamente seguros.
   *
   * O usuario e identificado pelo ID
   * existente no PostgreSQL.
   *
   * ATENCAO:
   * Este metodo apenas armazena a sessao.
   * Ele NAO realiza login nem valida senha.
   */
  async createSession(
    userId: number
  ): Promise<CreatedSession> {
    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      throw new Error(
        "ID de usuario invalido."
      );
    }

    // Gera um identificador imprevisivel.
    const tokenId = randomBytes(32).toString("hex");

    const now = Date.now();

    const session: SessionData = {
      userId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(
        now + SESSION_TTL_SECONDS * 1000
      ).toISOString()
    };

    // Armazena a sessao como String JSON.
    //
    // EX determina o TTL.
    // NX evita sobrescrever uma chave existente.
    const result = await this.redis.set(
      this.getKey(tokenId),
      JSON.stringify(session),
      {
        EX: SESSION_TTL_SECONDS,
        NX: true
      }
    );

    if (result !== "OK") {
      throw new Error(
        "Nao foi possivel criar a sessao."
      );
    }

    return {
      tokenId,
      session
    };
  }

  /**
   * Consulta uma sessao pelo tokenId.
   *
   * Retorna null caso nao exista,
   * tenha expirado ou o token seja invalido.
   */
  async getSession(
    tokenId: string
  ): Promise<SessionData | null> {
    if (!TOKEN_ID_REGEX.test(tokenId)) {
      return null;
    }

    const stored = await this.redis.get(
      this.getKey(tokenId)
    );

    if (!stored) {
      return null;
    }

    const parsed: unknown = JSON.parse(stored);

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        "Dados da sessao invalidos."
      );
    }

    const data = parsed as Record<string, unknown>;

    if (
      typeof data.userId !== "number" ||
      !Number.isSafeInteger(data.userId) ||
      data.userId <= 0 ||
      typeof data.createdAt !== "string" ||
      typeof data.expiresAt !== "string"
    ) {
      throw new Error(
        "Estrutura da sessao invalida."
      );
    }

    return {
      userId: data.userId,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt
    };
  }

  /**
   * Remove uma sessao antes de sua expiracao.
   *
   * Sera utilizado futuramente pelo logout.
   */
  async revokeSession(
    tokenId: string
  ): Promise<boolean> {
    if (!TOKEN_ID_REGEX.test(tokenId)) {
      return false;
    }

    const deleted = await this.redis.del(
      this.getKey(tokenId)
    );

    return deleted === 1;
  }
}

// ==========================================
// TODO (INTEGRACAO DE AUTENTICACAO)
// ==========================================
//
// Nesta etapa, o modulo de sessao sera
// utilizado somente por testes internos.
//
// Na proxima entrega:
//
// 1. Implementar login com PostgreSQL.
// 2. Validar email e senha do usuario.
// 3. Criar a sessao apenas apos login valido.
// 4. Enviar o token de forma segura ao navegador.
// 5. Implementar middleware para consultar
//    session:{tokenId} e identificar o userId.
// 6. Usar o userId autenticado para acessar
//    cart:{userId}.
// 7. Implementar logout usando revokeSession().
// 8. Avaliar renovacao e expiracao de sessoes.
// 9. Implementar protecao CSRF, cookies seguros
//    e outros controles de autenticacao.
//
// IMPORTANTE:
// O userId sozinho nao comprova autenticacao.
// Nunca disponibilizar um endpoint publico que
// crie sessoes para IDs arbitrarios.
