import "dotenv/config";
import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME;

if (!uri || !dbName) {
  throw new Error("Variáveis do MongoDB não configuradas.");
}

const client = new MongoClient(uri);

// estabele a conexão com o mongo
export async function connectMongo() {
  await client.connect();

  const db = client.db(dbName);

  console.log("MongoDB conectado com sucesso!");

  return db;
}

// derruba a conexão
export async function disconnectMongo() {
  await client.close();
}
