import styles from "./ProductThumbnail.module.css";

const corDeFundoPorCategoria: Record<string, string> = {
  eletronicos: "#d6e8fb",
  moda: "#fde0d9",
  beleza: "#fbe3ef",
  casa: "#e0f1e2",
  mercearia: "#fcefd2",
};

type ProductThumbnailProps = {
  title: string;
  categoryId: string;
};

export default function ProductThumbnail({ title, categoryId }: ProductThumbnailProps) {
  const primeirasDuasPalavras = title.split(" ").slice(0, 2);
  const iniciais = primeirasDuasPalavras.map((palavra) => palavra[0]).join("");

  return (
    <div
      className={styles.miniatura}
      style={{ backgroundColor: corDeFundoPorCategoria[categoryId] }}
    >
      {iniciais}
    </div>
  );
}
