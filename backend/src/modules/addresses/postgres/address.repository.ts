// Operações da tabela addresses.
//
// Todas as consultas filtram por user_id: um usuário nunca
// lê nem altera o endereço de outro.

import { pgPool, type PgExecutor } from "../../../config/postgres/postgres";

import type { AddressInput, AddressRow } from "./address.types";

const ADDRESS_COLUMNS = `
  id, user_id, recipient_name, street, street_number, complement,
  neighborhood, city, state, postal_code
`;

function toParams(input: AddressInput) {
  return [
    input.recipientName,
    input.street,
    input.streetNumber,
    input.complement,
    input.neighborhood,
    input.city,
    input.state,
    input.postalCode
  ];
}

export class AddressRepository {
  constructor(private readonly db: PgExecutor = pgPool) {}

  async findByUser(userId: number): Promise<AddressRow[]> {
    const { rows } = await this.db.query<AddressRow>(
      `SELECT ${ADDRESS_COLUMNS} FROM addresses WHERE user_id = $1 ORDER BY id`,
      [userId]
    );

    return rows;
  }

  async findById(
    userId: number,
    addressId: number,
    db: PgExecutor = this.db
  ): Promise<AddressRow | null> {
    const { rows } = await db.query<AddressRow>(
      `SELECT ${ADDRESS_COLUMNS} FROM addresses WHERE id = $1 AND user_id = $2`,
      [addressId, userId]
    );

    return rows[0] ?? null;
  }

  async create(userId: number, input: AddressInput): Promise<AddressRow> {
    const { rows } = await this.db.query<AddressRow>(
      `INSERT INTO addresses
         (user_id, recipient_name, street, street_number, complement,
          neighborhood, city, state, postal_code)
       VALUES ($9, $1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${ADDRESS_COLUMNS}`,
      [...toParams(input), userId]
    );

    return rows[0];
  }

  async update(
    userId: number,
    addressId: number,
    input: AddressInput
  ): Promise<AddressRow | null> {
    const { rows } = await this.db.query<AddressRow>(
      `UPDATE addresses SET
         recipient_name = $1, street = $2, street_number = $3, complement = $4,
         neighborhood = $5, city = $6, state = $7, postal_code = $8
       WHERE id = $9 AND user_id = $10
       RETURNING ${ADDRESS_COLUMNS}`,
      [...toParams(input), addressId, userId]
    );

    return rows[0] ?? null;
  }

  // Endereço usado em pedido não pode ser apagado (FK ON DELETE RESTRICT):
  // o PostgreSQL devolve o erro 23503, tratado pelo service.
  async delete(userId: number, addressId: number): Promise<boolean> {
    const { rowCount } = await this.db.query(
      "DELETE FROM addresses WHERE id = $1 AND user_id = $2",
      [addressId, userId]
    );

    return (rowCount ?? 0) > 0;
  }
}
