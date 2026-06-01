import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import Providers from "@/components/Providers";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata = {
  title: "Wara GPS — Dashboard Financiero",
  description: "Business Intelligence & Finance — Blo S.A.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={jakarta.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
