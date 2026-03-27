import IssueClient from "./IssueClient";

// For static export, we generate a single static page
// that will be used for all dynamic routes
export async function generateStaticParams() {
  // Return a single placeholder that will be used as the fallback
  return [{ id: 'index' }];
}

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IssueClient issueId={id} />;
}
