import { Inter, Noto_Sans_Tamil, Noto_Sans_Sinhala } from "next/font/google";
import type { Locale } from "@/i18n/config";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const notoTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const notoSinhala = Noto_Sans_Sinhala({
  subsets: ["sinhala"],
  weight: ["400", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export function fontForLocale(locale: Locale) {
  switch (locale) {
    case "ta":
      return notoTamil;
    case "si":
      return notoSinhala;
    case "en":
    default:
      return inter;
  }
}

export function htmlClassForLocale(locale: Locale): string {
  return `locale-${locale}`;
}
