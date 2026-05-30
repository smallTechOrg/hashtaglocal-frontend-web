import { Suspense } from "react";
import UpdateCameraClient from "./UpdateCameraClient";

export async function generateStaticParams() {
  return [{ id: "index" }];
}

export default async function UpdateCameraPage() {
  return (
    <Suspense fallback={null}>
      <UpdateCameraClient />
    </Suspense>
  );
}
