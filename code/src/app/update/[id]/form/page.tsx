import { Suspense } from "react";
import UpdateFormClient from "./UpdateFormClient";

export async function generateStaticParams() {
  return [{ id: "index" }];
}

export default async function UpdateFormPage() {
  return (
    <Suspense fallback={null}>
      <UpdateFormClient />
    </Suspense>
  );
}
