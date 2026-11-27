// Regras de cadastro, login e logout.
//
// PostgreSQL: dono dos usuários e dos hashes de senha (bcrypt).
// Redis:      dono das sessões (session:{tokenId}), via SessionRepository.

import bcrypt from "bcryptjs";

import {
  HttpError,
  isUniqueViolation,
  requireBody,
  requireString
} from "../../../shared/http";

import type { SessionRepository } from "../../session/redis/session.repository";
import type { CreatedSession } from "../../session/redis/session.types";

import { UserRepository } from "./user.repository";
import {
  toPublicUser,
  type LoginInput,
  type PublicUser,
  type RegisterInput
} from "./user.types";

// Mesmo custo usado no seed (002_seed_users.sql).
const BCRYPT_COST = 10;

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 72; // limite do próprio bcrypt

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const USERNAME_REGEX = /^[A-Za-z0-9_.]{3,80}$/;

// Hash usado quando o e-mail não existe, para que o login demore
// o mesmo tempo nos dois casos e não revele quais e-mails existem.
const DUMMY_HASH = bcrypt.hashSync("muambas-dummy-password", BCRYPT_COST);

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository
  ) {}

  // ==============================================
  // VALIDAÇÕES
  // ==============================================

  private validateEmail(value: unknown): string {
    const email = requireString(value, "email", 255).toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      throw new HttpError(400, "E-mail inválido.");
    }

    return email;
  }

  private validatePassword(value: unknown): string {
    if (typeof value !== "string") {
      throw new HttpError(400, "O campo password é obrigatório.");
    }

    if (
      value.length < MIN_PASSWORD_LENGTH ||
      value.length > MAX_PASSWORD_LENGTH
    ) {
      throw new HttpError(
        400,
        `A senha deve ter entre ${MIN_PASSWORD_LENGTH} e ${MAX_PASSWORD_LENGTH} caracteres.`
      );
    }

    return value;
  }

  private parseRegister(body: unknown): RegisterInput {
    const input = requireBody(body);

    const username = requireString(input.username, "username", 80);

    if (!USERNAME_REGEX.test(username)) {
      throw new HttpError(
        400,
        "O username deve ter de 3 a 80 caracteres: letras, números, '_' ou '.'."
      );
    }

    return {
      name: requireString(input.name, "name", 150),
      username,
      email: this.validateEmail(input.email),
      password: this.validatePassword(input.password)
    };
  }

  private parseLogin(body: unknown): LoginInput {
    const input = requireBody(body);

    if (typeof input.email !== "string" || typeof input.password !== "string") {
      throw new HttpError(400, "Informe email e password.");
    }

    return { email: input.email.trim(), password: input.password };
  }

  // ==============================================
  // OPERAÇÕES
  // ==============================================

  // Cadastra um novo usuário. Não faz login automaticamente.
  async register(body: unknown): Promise<PublicUser> {
    const input = this.parseRegister(body);

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    try {
      const user = await this.users.create({
        name: input.name,
        username: input.username,
        email: input.email,
        passwordHash
      });

      return toPublicUser(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new HttpError(409, "E-mail ou username já cadastrado.");
      }

      throw error;
    }
  }

  // Confere e-mail e senha e, só então, cria a sessão no Redis.
  async login(
    body: unknown
  ): Promise<{ user: PublicUser; session: CreatedSession }> {
    const input = this.parseLogin(body);

    const user = await this.users.findByEmail(input.email);

    const passwordOk = await bcrypt.compare(
      input.password,
      user?.password_hash ?? DUMMY_HASH
    );

    if (!user || !passwordOk) {
      // Mesma mensagem nos dois casos, de propósito.
      throw new HttpError(401, "E-mail ou senha inválidos.");
    }

    const session = await this.sessions.createSession(user.id);

    return { user: toPublicUser(user), session };
  }

  // Encerra a sessão antes da expiração.
  async logout(tokenId: string): Promise<void> {
    await this.sessions.revokeSession(tokenId);
  }

  // Dados do usuário logado (GET /api/auth/me).
  async getProfile(userId: number): Promise<PublicUser> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new HttpError(404, "Usuário não encontrado.");
    }

    return toPublicUser(user);
  }
}
