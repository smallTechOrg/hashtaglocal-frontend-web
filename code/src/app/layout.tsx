import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { ConditionalHeader, ConditionalFooter } from "./components/core/ConditionalChrome";
import Script from "next/dist/client/script";
import { AnalyticsProvider } from "./context/AnalyticsContext";


const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "#local",
  description: "A location based community platform",
  icons: {
    icon: "/logo-black.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
    <head>
    </head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-ZYDZM87HR8"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ZYDZM87HR8');
          `}
        </Script>
        {/* Google Ads Conversion Tracking */}
      <body
        className={`${montserrat.variable} antialiased min-h-screen flex flex-col`}
      >
        <AnalyticsProvider>
          <ConditionalHeader />
          <main className="flex-1">{children} </main>
          <ConditionalFooter />
        </AnalyticsProvider>
      </body>
    </html>
  );
}
