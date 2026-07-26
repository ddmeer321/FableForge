import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "riftbound-rng-beta.shihengzhangdd.chatgpt.site";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);

  return {
    metadataBase: baseUrl,
    title: "FableForge — Tales of the Wild",
    description:
      "Öffne magische Boxen, stelle dein Heldenteam zusammen und bezwinge einen taktischen Roguelite-Dungeon.",
    openGraph: {
      title: "FableForge — Tales of the Wild",
      description: "Dein Team. Dein Build. Dein Weg durch den Flüsterwald.",
      type: "website",
      images: [{ url: new URL("/og.png", baseUrl).toString(), width: 1536, height: 864, alt: "FableForge Fantasy-Abenteuer" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "FableForge — Tales of the Wild",
      description: "Eine spielbare Dungeon-RNG-Beta mit Boxen, Teambuilding und taktischen Kämpfen.",
      images: [new URL("/og.png", baseUrl).toString()],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#1c1d38",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
