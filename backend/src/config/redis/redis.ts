import "dotenv/config";
import { createClient } from "redis";

// Obtém o endereço do Redis configurado no arquivo .env.
const redisUrl = process.env.REDIS_URL;

// Impede que a aplicação seja iniciada sem a configuração necessária.
if (!redisUrl) {
  throw new Error("REDIS_URL não foi configurada no arquivo .env.");
}

// Cria o cliente responsável pela comunicação com o Redis.
// Ele será compartilhado pelos módulos que utilizarem esse banco.
export const redisClient = createClient({
  url: redisUrl
});

// Exporta o tipo do cliente para ser utilizado no repository.
export type RedisConnection = typeof redisClient;

// Registra possíveis erros de conexão com o Redis.
redisClient.on("error", (error) => {
  console.error("Erro na conexão com o Redis:", error);
});

// Estabelece a conexão com o Redis.
export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  console.log("Redis conectado com sucesso!");

  return redisClient;
}

// Encerra a conexão quando o backend for desligado.
export async function disconnectRedis() {
  if (redisClient.isOpen) {
    await redisClient.close();
  }
}

// TODO (AUTENTICACAO):
// Quando o módulo de autenticação estiver implementado,
// esta mesma conexão Redis poderá ser reutilizada para
// armazenar sessões identificadas por session:{tokenId}.
//
// A criação e validação dessas sessões devem ficar
// no módulo de autenticação, e não neste arquivo.
