
"use client";

import { useEffect } from "react";

export default function GuestCartInitializer() {
  useEffect(() => {
    // Solicita o carrinho atual ao backend.
    // Se não existir um cookie válido, o backend
    // gera automaticamente um identificador UUID.
    async function initializeGuestCart() {
      try {
        const response = await fetch(
          "http://localhost:3001/api/cart",
          {
            method: "GET",

            // Permite receber e enviar o cookie do carrinho.
            credentials: "include",

            // Evita utilizar uma resposta armazenada em cache.
            cache: "no-store"
          }
        );

        if (!response.ok) {
          console.warn(
            "Não foi possível inicializar o carrinho."
          );
        }
      } catch (error) {
        // Não interrompe o funcionamento do frontend
        // caso o backend esteja desligado.
        console.warn(
          "Backend do carrinho indisponível:",
          error
        );
      }
    }

    void initializeGuestCart();
  }, []);

  // Não renderiza nenhum elemento visual.
  return null;
}

// TODO (INTEGRACAO REDIS):
// Quando o frontend passar a utilizar o carrinho real,
// centralizar as consultas e atualizações em um serviço.
//
// Este componente realiza apenas a identificação
// inicial do visitante, sem manipular produtos.
//
// TODO (DEPLOY):
// Substituir a URL localhost pela configuração
// do endereço real da API.
