// Utilitários HTTP compartilhados pelos módulos do PostgreSQL
// (auth, endereços, estoque, pedidos e outbox).
//
// Segue a mesma ideia do CartError + reply() do carrinho:
// erros esperados viram respostas 4xx; o resto vira 500.

import type { Response } from "express";

// Erro esperado, com o status HTTP que deve ser devolvido.
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// Executa a ação da rota e transforma o resultado em resposta JSON.
export async function sendResult(
  res: Response,
  action: () => Promise<unknown>,
  options: { status?: number; context?: string } = {}
): Promise<void> {
  try {
    const result = await action();

    if (result === undefined) {
      res.status(204).end();
      return;
    }

    res.status(options.status ?? 200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({
        error: error.message,
        ...(error.details !== undefined ? { details: error.details } : {})
      });

      return;
    }

    console.error(
      `Erro ao processar ${options.context ?? "requisição"}:`,
      error
    );

    res.status(500).json({
      error: "Erro interno do servidor."
    });
  }
}

// ==============================================
// VALIDAÇÕES SIMPLES
// ==============================================

// Garante que o corpo da requisição é um objeto JSON.
export function requireBody(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Corpo da requisição inválido.");
  }

  return body as Record<string, unknown>;
}

// Texto obrigatório, sem espaços nas pontas, com tamanho máximo.
export function requireString(
  value: unknown,
  field: string,
  maxLength: number
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `O campo ${field} é obrigatório.`);
  }

  const text = value.trim();

  if (text.length > maxLength) {
    throw new HttpError(
      400,
      `O campo ${field} aceita no máximo ${maxLength} caracteres.`
    );
  }

  return text;
}

// Texto opcional: vazio ou ausente vira null.
export function optionalString(
  value: unknown,
  field: string,
  maxLength: number
): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return requireString(value, field, maxLength);
}

// Identificador numérico positivo (ex.: :id da rota ou addressId).
export function requireId(value: unknown, field: string): number {
  const id = typeof value === "string" ? Number(value) : value;

  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
    throw new HttpError(400, `${field} inválido.`);
  }

  return id;
}

// Erros do PostgreSQL que viram respostas amigáveis.
export function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === "23505";
}

export function isForeignKeyViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === "23503";
}
