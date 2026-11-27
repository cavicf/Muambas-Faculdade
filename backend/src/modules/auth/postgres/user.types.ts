// Linha da tabela users, como vem do PostgreSQL.
// Contém o hash da senha: NUNCA devolver este tipo pela API.
export interface UserRow {
  id: number;
  name: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

// Dados públicos do usuário, seguros para enviar ao front-end.
export interface PublicUser {
  id: number;
  name: string;
  username: string;
  email: string;
  createdAt: string;
}

// Usuário identificado pela sessão do Redis em cada requisição.
export interface AuthenticatedUser {
  id: number;
}

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// Converte a linha do banco para o formato público.
export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    createdAt: row.created_at.toISOString()
  };
}
