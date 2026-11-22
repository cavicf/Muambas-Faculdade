import Link from "next/link";
import styles from "./page.module.css";
import ProductThumbnail from "@/components/ProductThumbnail/ProductThumbnail";
import { carrinho, produtos, Product } from "@/mocks/mock-data";
import { formatarPreco } from "@/utils/formatarPreco";

type ItemDoCarrinho = {
  produto: Product;
  quantidade: number;
  subtotal: number;
};

export default function Carrinho() {
  const itensDoCarrinho: ItemDoCarrinho[] = [];
  let total = 0;

  for (const productId in carrinho) {
    const produto = produtos.find((produto) => produto._id === productId);

    if (produto) {
      const quantidade = carrinho[productId];
      const subtotal = produto.price * quantidade;

      itensDoCarrinho.push({ produto, quantidade, subtotal });
      total += subtotal;
    }
  }

  if (itensDoCarrinho.length === 0) {
    return (
      <div>
        <h2 className={styles.titulo}>Meu carrinho</h2>
        <p>Seu carrinho está vazio.</p>
        <Link href="/" className={styles.linkCatalogo}>
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className={styles.titulo}>Meu carrinho</h2>

      <div className={styles.conteudo}>
        <div className={styles.lista}>
          {itensDoCarrinho.map((item) => (
            <div key={item.produto._id} className={`card ${styles.item}`}>
              <div className={styles.miniatura}>
                <ProductThumbnail title={item.produto.title} categoryId={item.produto.categoryId} />
              </div>

              <div className={styles.nome}>
                <p>{item.produto.title}</p>
                <p className={styles.precoUnitario}>{formatarPreco(item.produto.price)} un.</p>
              </div>

              <div className={styles.quantidade}>
                <button className={styles.botaoQuantidade}>−</button>
                <span>{item.quantidade}</span>
                <button className={styles.botaoQuantidade}>+</button>
              </div>

              <p className={styles.subtotal}>{formatarPreco(item.subtotal)}</p>

              <button className={styles.remover}>Remover</button>
            </div>
          ))}
        </div>

        <div className={`card ${styles.resumo}`}>
          <div className={styles.total}>
            <span>Total</span>
            <strong>{formatarPreco(total)}</strong>
          </div>

          <Link href="/checkout" className={`botao ${styles.finalizar}`}>
            Finalizar compra
          </Link>
        </div>
      </div>
    </div>
  );
}
