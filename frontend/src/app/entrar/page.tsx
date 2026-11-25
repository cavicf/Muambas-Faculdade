"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function Entrar() {
  const [estaCadastrando, setEstaCadastrando] = useState(false);

  return (
    <div className={`card ${styles.formulario}`}>
      <div className={styles.abas}>
        <button
          className={estaCadastrando ? styles.aba : styles.abaSelecionada}
          onClick={() => setEstaCadastrando(false)}
        >
          Entrar
        </button>
        <button
          className={estaCadastrando ? styles.abaSelecionada : styles.aba}
          onClick={() => setEstaCadastrando(true)}
        >
          Cadastrar
        </button>
      </div>

      {estaCadastrando && (
        <>
          <input className="campoBusca" type="text" placeholder="Nome" />
          <input
            className="campoBusca"
            type="text"
            placeholder="Nome de usuário"
          />
        </>
      )}

      <input className="campoBusca" type="email" placeholder="E-mail" />
      <input className="campoBusca" type="password" placeholder="Senha" />

      <button className="botao">
        {estaCadastrando ? "Criar conta" : "Entrar"}
      </button>
    </div>
  );
}
