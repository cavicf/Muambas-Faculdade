// Operações da tabela users no PostgreSQL.
//
// Método        SQL
// findByEmail() SELECT ... WHERE LOWER(email) = LOWER($1)
// findById()    SELECT ... WHERE id = $1
// create()      INSERT ... RETURNING

import { pgPool, type PgExecutor } from "../../../config/postgres/postgres";

import type { UserRow } from "./user.types";

const USER_COLUMNS = "id, name, username, email, password_hash, created_at";

export class UserRepository {
  constructor(private readonly db: PgExecutor = pgPool) {}

  // A busca ignora maiúsculas/minúsculas e usa o índice users_email_unique.
  async findByEmail(email: string): Promise<UserRow | null> {
    const { rows } = await this.db.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    return rows[0] ?? null;
  }

  async findById(id: number): Promise<UserRow | null> {
    const { rows } = await this.db.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [id]
    );

    return rows[0] ?? null;
  }

  // E-mail ou username repetido gera o erro 23505 (unique_violation),
  // tratado pelo AuthService.
  async create(input: {
    name: string;
    username: string;
    email: string;
    passwordHash: string;
  }): Promise<UserRow> {
    const { rows } = await this.db.query<UserRow>(
      `INSERT INTO users (name, username, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING ${USER_COLUMNS}`,
      [input.name, input.username, input.email, input.passwordHash]
    );

    return rows[0];
  }
}
