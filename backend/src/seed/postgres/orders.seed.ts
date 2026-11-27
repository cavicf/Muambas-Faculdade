// Seed de pedidos históricos para os usuários de teste.
//
// A mock.shop não fornece pedidos; por isso cada usuário de teste
// recebe um endereço (se não tiver) e 2 pedidos antigos:
// - um "entregue", feito há 20-40 dias
// - um "enviado",  feito há 2-6 dias
//
// Decisão da equipe: estes pedidos representam compras passadas e
// NÃO baixam o estoque nem geram eventos na outbox. O estoque
// gerado pelo seed:inventory já é o que sobrou depois deles.
//
// Idempotente: usuário que já tem pedidos é ignorado.
// Pré-requisitos: seed:mongo, seed:postgres e seed:inventory.

import { connectMongo, disconnectMongo } from "../../config/mongoDB/mongo";
import {
  connectPostgres,
  disconnectPostgres,
  pgPool,
  withTransaction
} from "../../config/postgres/postgres";

import type { Product } from "../../modules/catalog/mongoDB/product.types";
import { AddressRepository } from "../../modules/addresses/postgres/address.repository";
import {
  formatAddressSnapshot,
  toAddress
} from "../../modules/addresses/postgres/address.types";
import { OrderRepository } from "../../modules/orders/postgres/order.repository";
import {
  PAYMENT_METHODS,
  type CheckoutLine,
  type OrderStatus
} from "../../modules/orders/postgres/order.types";

const TEST_USER_EMAILS = [
  "rodolfo@unifei.edu.br",
  "luis@unifei.edu.br",
  "camily@unifei.edu.br",
  "joao@unifei.edu.br"
];

const DAY_MS = 24 * 60 * 60 * 1000;

const HISTORY: {
  status: OrderStatus;
  minDaysAgo: number;
  maxDaysAgo: number;
}[] = [
  { status: "entregue", minDaysAgo: 20, maxDaysAgo: 40 },
  { status: "enviado", minDaysAgo: 2, maxDaysAgo: 6 }
];

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickRandom<T>(items: T[], count: number): T[] {
  return [...items].sort(() => Math.random() - 0.5).slice(0, count);
}

async function main() {
  try {
    const mongo = await connectMongo();
    await connectPostgres();

    // Somente produtos que existem nos dois bancos (catálogo + estoque).
    const { rows: stocked } = await pgPool.query<{ product_id: string }>(
      "SELECT product_id FROM inventory"
    );

    const products = await mongo
      .collection<Product>("products")
      .find({ _id: { $in: stocked.map((row) => row.product_id) } })
      .toArray();

    if (products.length === 0) {
      console.log(
        "Sem produtos com estoque. Rode antes: npm run seed:inventory"
      );
      process.exitCode = 1;
      return;
    }

    const { rows: users } = await pgPool.query<{
      id: number;
      name: string;
      email: string;
    }>(
      "SELECT id, name, email FROM users WHERE LOWER(email) = ANY($1::text[]) ORDER BY id",
      [TEST_USER_EMAILS]
    );

    const orderRepository = new OrderRepository();

    for (const user of users) {
      if ((await orderRepository.countByUser(user.id)) > 0) {
        console.log(`${user.email}: já possui pedidos, ignorado.`);
        continue;
      }

      await withTransaction(async (client) => {
        const addressRepository = new AddressRepository(client);

        // Endereço padrão: UNIFEI, campus Itajubá.
        let [addressRow] = await addressRepository.findByUser(user.id);

        addressRow ??= await addressRepository.create(user.id, {
          recipientName: user.name,
          street: "Av. BPS",
          streetNumber: "1303",
          complement: null,
          neighborhood: "Pinheirinho",
          city: "Itajubá",
          state: "MG",
          postalCode: "37500-903"
        });

        const address = toAddress(addressRow);

        for (const history of HISTORY) {
          const createdAt = new Date(
            Date.now() -
              randomInt(history.minDaysAgo, history.maxDaysAgo) * DAY_MS
          );

          const lines: CheckoutLine[] = pickRandom(
            products,
            randomInt(1, 3)
          ).map((product) => ({
            productId: product._id,
            productTitle: product.title,
            unitPrice: product.price,
            quantity: randomInt(1, 2)
          }));

          const totalAmount =
            lines.reduce(
              (total, line) =>
                total + Math.round(line.unitPrice * 100) * line.quantity,
              0
            ) / 100;

          const orderId = await orderRepository.insertOrder(client, {
            userId: user.id,
            addressId: address.id,
            shippingAddressSnapshot: formatAddressSnapshot(address),
            status: history.status,
            totalAmount,
            createdAt
          });

          await orderRepository.insertItems(client, orderId, lines);

          await orderRepository.insertPayment(client, {
            orderId,
            method: PAYMENT_METHODS[randomInt(0, PAYMENT_METHODS.length - 1)],
            amount: totalAmount,
            status: "aprovado",
            createdAt
          });
        }
      });

      console.log(
        `${user.email}: ${HISTORY.length} pedidos históricos criados.`
      );
    }
  } catch (error) {
    console.error("Erro durante a carga de pedidos:", error);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([disconnectMongo(), disconnectPostgres()]);
  }
}

main();
