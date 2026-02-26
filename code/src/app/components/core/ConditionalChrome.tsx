"use client";

import { usePathname } from "next/navigation";
import Header from "./header";
import Footer from "./footer";

export function ConditionalHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith("/ops")) return null;
  return <Header />;
}

export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/ops")) return null;
  return <Footer />;
}
