import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  connectPostgres,
  disconnectPostgres,
  pgPool
} from "../../config/postgres/postgres";

// Reaproveita o mesmo SQL executado pelo container na primeira
// inicialização, mantendo uma única fonte para os usuários de teste.
const SEED_FILES = ["002_seed_users.sql"];

const INIT_DIR = path.resolve(__dirname, "../../../database/postgres/init");

async function main() {
  try {
    await connectPostgres();

    for (const file of SEED_FILES) {
      const sql = await readFile(path.join(INIT_DIR, file), "utf8");

      await pgPool.query(sql);

      console.log(`Executado: ${file}`);
    }

    const { rows } = await pgPool.query<{ id: number; email: string }>(
      "SELECT id, email FROM users ORDER BY id"
    );

    console.log("Usuários no PostgreSQL:");
    console.table(rows);
  } catch (error) {
    console.error("Erro durante a carga do PostgreSQL:", error);
    process.exitCode = 1;
  } finally {
    await disconnectPostgres();
  }
}

main();
