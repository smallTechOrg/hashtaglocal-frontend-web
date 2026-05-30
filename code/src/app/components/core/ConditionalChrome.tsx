"use client";

import { usePathname } from "next/navigation";
import Header from "./header";
import Footer from "./footer";
import ReportIssueButton from "../report-issue/ReportIssueButton";

function isNoChromePath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/report/camera" || pathname === "/report/form") return true;
  // /update/[id]/camera  and  /update/[id]/form
  if (/^\/update\/[^/]+\/(camera|form)$/.test(pathname)) return true;
  return false;
}

export function ConditionalHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith("/ops")) return null;
  if (isNoChromePath(pathname)) return null;
  return <Header />;
}

export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/ops")) return null;
  if (isNoChromePath(pathname)) return null;
  return <Footer />;
}

export function ConditionalReportButton() {
  const pathname = usePathname();
  if (pathname?.startsWith("/ops")) return null;
  if (pathname?.startsWith("/issue/")) return null;
  if (pathname?.startsWith("/report")) return null;
  if (pathname?.startsWith("/update/")) return null;
  return <ReportIssueButton variant="fab" />;
}
