// Regras dos endereços de entrega do usuário logado.

import {
  HttpError,
  isForeignKeyViolation,
  optionalString,
  requireBody,
  requireId,
  requireString
} from "../../../shared/http";

import type { PgExecutor } from "../../../config/postgres/postgres";

import { AddressRepository } from "./address.repository";
import { toAddress, type Address, type AddressInput } from "./address.types";

const STATE_REGEX = /^[A-Z]{2}$/;
const POSTAL_CODE_REGEX = /^[0-9]{5}-?[0-9]{3}$/;

export class AddressService {
  constructor(private readonly repository: AddressRepository) {}

  // Mesmas regras dos CHECKs do schema, com mensagens amigáveis.
  private parse(body: unknown): AddressInput {
    const input = requireBody(body);

    const state = requireString(input.state, "state", 2).toUpperCase();

    if (!STATE_REGEX.test(state)) {
      throw new HttpError(400, "UF inválida. Use a sigla, ex.: MG.");
    }

    const postalCode = requireString(input.postalCode, "postalCode", 10);

    if (!POSTAL_CODE_REGEX.test(postalCode)) {
      throw new HttpError(400, "CEP inválido. Use 37500-903 ou 37500903.");
    }

    return {
      recipientName: requireString(input.recipientName, "recipientName", 150),
      street: requireString(input.street, "street", 200),
      streetNumber: requireString(input.streetNumber, "streetNumber", 20),
      complement: optionalString(input.complement, "complement", 120),
      neighborhood: optionalString(input.neighborhood, "neighborhood", 120),
      city: requireString(input.city, "city", 120),
      state,
      postalCode
    };
  }

  async list(userId: number): Promise<Address[]> {
    const rows = await this.repository.findByUser(userId);

    return rows.map(toAddress);
  }

  // Usado também pelo checkout (dentro da transação).
  async getOwned(
    userId: number,
    addressId: unknown,
    db?: PgExecutor
  ): Promise<Address> {
    const id = requireId(addressId, "addressId");

    const row = await this.repository.findById(userId, id, db);

    if (!row) {
      throw new HttpError(404, "Endereço não encontrado.");
    }

    return toAddress(row);
  }

  async create(userId: number, body: unknown): Promise<Address> {
    const row = await this.repository.create(userId, this.parse(body));

    return toAddress(row);
  }

  async update(
    userId: number,
    addressId: unknown,
    body: unknown
  ): Promise<Address> {
    const id = requireId(addressId, "id");

    const row = await this.repository.update(userId, id, this.parse(body));

    if (!row) {
      throw new HttpError(404, "Endereço não encontrado.");
    }

    return toAddress(row);
  }

  async delete(userId: number, addressId: unknown): Promise<void> {
    const id = requireId(addressId, "id");

    try {
      const deleted = await this.repository.delete(userId, id);

      if (!deleted) {
        throw new HttpError(404, "Endereço não encontrado.");
      }
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new HttpError(
          409,
          "Este endereço já foi usado em um pedido e não pode ser removido."
        );
      }

      throw error;
    }
  }
}
