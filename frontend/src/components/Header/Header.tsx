import Link from "next/link";
import styles from "./Header.module.css";
import { carrinho, usuarioLogado } from "@/mocks/mock-data";

export default function Header() {
  const nomeUsuario = usuarioLogado?.name;

  let quantidadeCarrinho = 0;
  for (const productId in carrinho) {
    quantidadeCarrinho += carrinho[productId];
  }

  return (
    <header className={styles.header}>
      <div className={styles.faixa}></div>

      <div className={styles.conteudo}>
        <Link href="/" className={styles.logo}>
          MUAMBAS <span className={styles.logoDestaque}>UNIFEI</span>
        </Link>

        <nav className={styles.menu}>
          <Link href="/">Catálogo</Link>
          <Link href="/pedidos">Meus pedidos</Link>
          <Link href="/carrinho">
            Carrinho {quantidadeCarrinho > 0 && `(${quantidadeCarrinho})`}
          </Link>

          {nomeUsuario ? (
            <span className={styles.usuario}>
              Olá, {nomeUsuario} <button className={styles.sair}>sair</button>
            </span>
          ) : (
            <Link href="/entrar" className="botao">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
