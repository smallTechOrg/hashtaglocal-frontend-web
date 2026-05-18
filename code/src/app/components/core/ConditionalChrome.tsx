"use client";

import { usePathname } from "next/navigation";
import Header from "./header";
import Footer from "./footer";
import ReportIssueButton from "../report-issue/ReportIssueButton";

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

export function ConditionalReportButton() {
  const pathname = usePathname();
  if (pathname?.startsWith("/ops")) return null;
  if (pathname?.startsWith("/issue/")) return null;
  return <ReportIssueButton />;
}
