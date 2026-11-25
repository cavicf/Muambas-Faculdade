import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import Header from "@/components/Header/Header";
import "./globals.css";
import GuestCartInitializer from "@/components/GuestCartInitializer/GuestCartInitializer";

const spaceGrotesk = Space_Grotesk({
  variable: "--fonte-titulo",
  subsets: ["latin"]
});

const dmSans = DM_Sans({
  variable: "--fonte-texto",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "Muambas UNIFEI",
  description: "E-commerce"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${spaceGrotesk.variable} ${dmSans.variable}`}
    >
      <body>
        {/* Inicializa a identificação do carrinho visitante. */}
        <GuestCartInitializer />
        
        <Header />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
