import IssueClient from "./IssueClient";
import { Suspense } from "react";

// For static export, we generate a single static page
// that will be used for all dynamic routes
export async function generateStaticParams() {
  // Return a single placeholder that will be used as the fallback
  return [{ id: 'index' }];
}

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading…</p>
        </div>
      }
    >
      <IssueClient issueId={id} />
    </Suspense>
  );
}
