import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { ConditionalHeader, ConditionalFooter, ConditionalReportButton } from "./components/core/ConditionalChrome";
import Script from "next/script";
import { AnalyticsProvider } from "./context/AnalyticsContext";
// SEO IMPROVEMENT: Import structured data generation functions for JSON-LD schema markup
import { getOrganizationSchema, getWebSiteSchema } from "@/utils/structuredData";


const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});
const siteUrl = "https://local.smalltech.in";

export const metadata: Metadata = {
  title: "#local - Connect with Your Community on Civic Issues",
  description: "Discover and engage with local community issues on #local. A location-based platform connecting neighbors to discuss and resolve community challenges together.",
  keywords: ["community", "local", "location-based", "neighborhood", "social","garbage","potholes","waste", "civic issues", "issue reporting"],
  icons: {
    icon: "/logo-black.png",
  },
 // Added author metadata - helps establish content authority
  authors: [{ name: "#local" }],
  //Added creator metadata - identifies original content creator
  creator: "#local",
  //Added robots meta tag - controls search engine indexing behavior
  // max-snippet:-1 allows full snippet in search results
  // max-image-preview:large allows large image previews
  robots: "index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large",
  //  Open Graph tags - controls how social media platforms (Facebook, LinkedIn, etc.) display your content
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "#local",
    title: "#local - Connect with Your Community on Civic Issues",
    description: "Discover and engage with local community issues on #local. A location-based platform connecting neighbors to discuss and resolve community challenges together.",
    images: [
      {
        url: `${siteUrl}/logo-green.png`,
        width: 1200,
        height: 630,
        alt: "#local - Community Connection Platform",
        type: "image/png",
      },
    ],
  },
  //Twitter Card tags - controls how Twitter/X displays your content when shared
  twitter: {
    // summary_large_image shows a large preview card with image on Twitter
    card: "summary_large_image",
    // @username of site account for Twitter attribution
    site: "@hashtaglocal_",
    // @username of content creator for Twitter attribution
    creator: "@hashtaglocal_",
    // Display title when shared on Twitter
    title: "#local - Connect with Your Community on Civic Issues",
    // Display description when shared on Twitter
    description: "Discover and engage with local community issues on #local. A location-based platform connecting neighbors to discuss and resolve community challenges together.",
    // Image to show in Twitter card preview
    images: [`${siteUrl}/logo-green.png`],
  },
  // Alternative URLs (canonical alternate) - helps with multi-regional content
  alternates: {
    canonical: siteUrl,
  },
  // Set metadata base URL for Next.js to properly construct absolute URLs for meta tags
  metadataBase: new URL(siteUrl),
};

// Viewport settings for mobile responsiveness (mobile-friendly is ranking factor)
// In Next.js 13+, viewport must be exported separately from metadata
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Generate JSON-LD structured data for search engines
  // Organizations use this to understand company information and branding
  const organizationSchema = getOrganizationSchema(siteUrl);
  // Website schema helps search engines understand site structure and enables search functionality
  const websiteSchema = getWebSiteSchema(siteUrl);

  return (
    <html lang="en">
    <head>
      {/* SEO: JSON-LD Structured Data */}
      {/* Organization schema helps Google display company info, logo, and social profiles */}
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      {/* Website schema enables sitelink search box and helps Google understand site structure */}
      <Script
        id="website-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
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
          <main className="flex-1">{children}</main>
          <ConditionalFooter />
          <ConditionalReportButton />
        </AnalyticsProvider>
      </body>
    </html>
  );
}

