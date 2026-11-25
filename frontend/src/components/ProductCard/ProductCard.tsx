import Link from "next/link";
import styles from "./ProductCard.module.css";
import ProductThumbnail from "@/components/ProductThumbnail/ProductThumbnail";
import { Product } from "@/mocks/mock-data";
import { formatarPreco } from "@/utils/formatarPreco";

type ProductCardProps = {
  produto: Product;
};

export default function ProductCard({ produto }: ProductCardProps) {
  const estaEsgotado = produto.availabilityStatus === "Esgotado";

  return (
    <div className={`card ${styles.produto}`}>
      <Link href={`/produto/${produto._id}`}>
        <ProductThumbnail
          title={produto.title}
          categoryId={produto.categoryId}
        />
        <p className={styles.marca}>{produto.vendor}</p>
        <p className={styles.titulo}>{produto.title}</p>
      </Link>

      <p className={styles.preco}>{formatarPreco(produto.price)}</p>

      <p className={estaEsgotado ? styles.esgotado : styles.disponibilidade}>
        {produto.availabilityStatus}
      </p>

      <button className="botao" disabled={estaEsgotado}>
        Adicionar
      </button>
    </div>
  );
}
