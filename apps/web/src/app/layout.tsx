import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AdSenseScript } from "@/components/ads/adsense-script";

export const metadata: Metadata = {
  title: {
    default: "Paylane · Airtime, data and bills in one lane",
    template: "%s · Paylane",
  },
  description:
    "Paylane is a modern VTU and utility payments platform for airtime, data bundles, cable TV and electricity, with a protected wallet, instant receipts and scoped admin access.",
  applicationName: "Paylane",
  keywords: [
    "VTU platform",
    "buy airtime Nigeria",
    "data bundles",
    "cable TV subscription",
    "electricity tokens",
    "wallet payments",
  ],
  openGraph: {
    title: "Paylane · Airtime, data and bills in one lane",
    description:
      "Top up airtime, data, cable TV and electricity from one colourful wallet built for Nigerian customers and operators.",
    siteName: "Paylane",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#082c21",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body className="min-h-dvh antialiased">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
        <AdSenseScript />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-cream"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
