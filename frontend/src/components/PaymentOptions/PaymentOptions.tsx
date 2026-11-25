"use client";

import { useState } from "react";
import styles from "./PaymentOptions.module.css";

const formasDePagamento = ["Pix", "Cartão", "Boleto"];

export default function PaymentOptions() {
  const [formaSelecionada, setFormaSelecionada] = useState("Pix");

  return (
    <div className={styles.opcoes}>
      {formasDePagamento.map((forma) => (
        <button
          key={forma}
          className={
            forma === formaSelecionada ? styles.opcaoSelecionada : styles.opcao
          }
          onClick={() => setFormaSelecionada(forma)}
        >
          {forma}
        </button>
      ))}
    </div>
  );
}
