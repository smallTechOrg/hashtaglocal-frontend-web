import type { Metadata } from "next";
import Static from "./static/page";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <Static />
  );
}
