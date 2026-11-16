import type { Metadata } from "next";

// /static renders the same map explorer as the home page: canonicalise it to "/".
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  robots: { index: false, follow: true },
};

export default function StaticLayout({ children }: { children: React.ReactNode }) {
  return children;
}
