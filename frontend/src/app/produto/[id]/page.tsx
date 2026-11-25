import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
import ProductThumbnail from "@/components/ProductThumbnail/ProductThumbnail";
import { categorias, estoque, produtos } from "@/mocks/mock-data";
import { formatarPreco } from "@/utils/formatarPreco";

type DetalheProdutoProps = {
  params: Promise<{ id: string }>;
};

export default async function DetalheProduto({ params }: DetalheProdutoProps) {
  const { id } = await params;

  const produto = produtos.find((produto) => produto._id === id);
  if (!produto) {
    notFound();
  }

  const categoria = categorias.find(
    (categoria) => categoria._id === produto.categoryId
  );
  const estoqueDoProduto = estoque.find(
    (item) => item.product_id === produto._id
  );
  const quantidadeDisponivel = estoqueDoProduto
    ? estoqueDoProduto.quantity_available
    : 0;
  const estaEsgotado = quantidadeDisponivel === 0;

  return (
    <div>
      <Link href="/" className={styles.voltar}>
        ← Voltar ao catálogo
      </Link>

      <div className={styles.conteudo}>
        <ProductThumbnail
          title={produto.title}
          categoryId={produto.categoryId}
        />

        <div className={styles.informacoes}>
          <p className={styles.marcaECategoria}>
            {produto.vendor} · {categoria?.name}
          </p>

          <h1>{produto.title}</h1>

          <p className={styles.preco}>{formatarPreco(produto.price)}</p>

          {estaEsgotado ? (
            <p className={styles.esgotado}>Esgotado</p>
          ) : (
            <p className={styles.disponibilidade}>
              Em estoque ({quantidadeDisponivel} disponíveis)
            </p>
          )}

          <p>{produto.description}</p>

          // TODO (INTEGRACAO REDIS):
          // Integrar o botão "Adicionar ao carrinho"
          // com POST /api/cart/items.
          //
          // Utilizar o productId real e a quantidade
          // selecionada pelo usuário.
          //
          // O carrinho visitante será identificado
          // automaticamente pelo cookie HttpOnly.
          //
          // A interação deverá ficar em um Client Component.
          // A validação definitiva do estoque será realizada
          // pelo PostgreSQL durante o checkout.

          <div className={styles.compra}>
            <input
              type="number"
              className={`campoBusca ${styles.quantidade}`}
              min={1}
              max={quantidadeDisponivel}
              defaultValue={1}
              disabled={estaEsgotado}
            />
            <button className="botao" disabled={estaEsgotado}>
              Adicionar ao carrinho
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

