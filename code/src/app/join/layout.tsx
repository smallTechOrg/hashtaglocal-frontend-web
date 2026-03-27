import type { Metadata } from "next";
const siteUrl = "https://local.smalltech.in";
// Join page-specific metadata
export const metadata: Metadata = {
  title: "#local Join Community - Report Local Issues",
  description: "Join #local and report issues in your community. Help improve your neighborhood by reporting potholes, waste, safety concerns, and more.",
  alternates: { canonical: `${siteUrl}/join` },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${siteUrl}/join`,
    siteName: "#local",
    title: "#local Join Community - Report Local Issues",
    description: "Join #local and report issues in your community. Help improve your neighborhood by reporting potholes, waste, safety concerns, and more.",
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
};

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
