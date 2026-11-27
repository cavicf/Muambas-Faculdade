// Linha da tabela addresses.
export interface AddressRow {
  id: number;
  user_id: number;
  recipient_name: string;
  street: string;
  street_number: string;
  complement: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  postal_code: string;
}

// Campos enviados pelo front-end para criar/editar um endereço.
export interface AddressInput {
  recipientName: string;
  street: string;
  streetNumber: string;
  complement: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  postalCode: string;
}

// Formato devolvido pela API (camelCase, como o resto da API).
export interface Address extends AddressInput {
  id: number;
}

export function toAddress(row: AddressRow): Address {
  return {
    id: row.id,
    recipientName: row.recipient_name,
    street: row.street,
    streetNumber: row.street_number,
    complement: row.complement,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code
  };
}

// Texto gravado em orders.shipping_address_snapshot.
// Ex.: "Camily Victal Finamor - Av. BPS, 1303 - Pinheirinho, Itajubá/MG - CEP 37500-903"
export function formatAddressSnapshot(address: Address): string {
  const line = [
    `${address.street}, ${address.streetNumber}`,
    address.complement
  ]
    .filter(Boolean)
    .join(" ");

  const district = address.neighborhood ? ` - ${address.neighborhood}` : "";

  return (
    `${address.recipientName} - ${line}${district}, ` +
    `${address.city}/${address.state} - CEP ${address.postalCode}`
  );
}
