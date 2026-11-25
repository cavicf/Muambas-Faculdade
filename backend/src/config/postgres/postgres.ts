import "dotenv/config";
import { Pool, types } from "pg";

// Obtém o endereço do PostgreSQL configurado no arquivo .env.
const postgresUrl = process.env.POSTGRES_URL;

// Impede que a aplicação seja iniciada sem a configuração necessária.
if (!postgresUrl) {
  throw new Error("POSTGRES_URL não foi configurada no arquivo .env.");
}

// Por padrão o driver devolve NUMERIC (1700) e BIGINT (20) como string,
// para não perder precisão. Os valores do projeto (preços em R$ e ids)
// cabem com segurança em number, então convertemos automaticamente.
types.setTypeParser(1700, (value) => Number(value));
types.setTypeParser(20, (value) => Number(value));

// Pool de conexões compartilhado pelos módulos que usarem o PostgreSQL
// (usuários, estoque, pedidos, pagamentos e outbox).
//
// Para transações (ex.: checkout), obter um cliente dedicado:
//   const client = await pgPool.connect();
//   try { await client.query("BEGIN"); ... await client.query("COMMIT"); }
//   catch (e) { await client.query("ROLLBACK"); throw e; }
//   finally { client.release(); }
export const pgPool = new Pool({
  connectionString: postgresUrl,
  max: 10
});

// Registra erros de conexões ociosas do pool.
pgPool.on("error", (error) => {
  console.error("Erro na conexão com o PostgreSQL:", error);
});

// Verifica se o PostgreSQL está acessível.
export async function connectPostgres() {
  await pgPool.query("SELECT 1");

  console.log("PostgreSQL conectado com sucesso!");

  return pgPool;
}

// Encerra todas as conexões do pool.
export async function disconnectPostgres() {
  await pgPool.end();
}
