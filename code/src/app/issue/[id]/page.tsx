import type { Metadata } from "next";
import IssueClient from "./IssueClient";
import { Suspense } from "react";
import { extractIssueId } from "../../../utils/issueSlug";
import {
  SITE_URL,
  fetchAllIssues,
  issueCreatedAt,
  issueDescription,
  issueImage,
  issueSlug,
  issueTitle,
  issueUrl,
} from "../issueSeo";

// Static export: one real HTML page per issue (its slug URL, plus the bare numeric id that
// feed/explorer cards link to), each with its own title, description and canonical. Issues
// created after the last build still open through the 'index' page + 404.html fallback.
export async function generateStaticParams() {
  const issues = await fetchAllIssues();
  const params = new Set<string>(["index"]);
  for (const issue of issues) {
    params.add(issueSlug(issue));
    params.add(String(issue.id));
  }
  return [...params].map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const issue =
    id === "index"
      ? undefined
      : (await fetchAllIssues()).find((i) => String(i.id) === extractIssueId(id));

  if (!issue) {
    // The client-side fallback shell: never index it.
    return {
      title: "Issue | #local",
      robots: { index: false, follow: true },
      alternates: { canonical: null },
    };
  }

  const title = `${issueTitle(issue)} | #local`;
  const description = issueDescription(issue);
  const url = issueUrl(issue);
  const image = issueImage(issue) ?? `${SITE_URL}/logo-green.png`;
  const publishedTime = issueCreatedAt(issue)?.toISOString();

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: "#local",
      locale: "en_IN",
      url,
      title,
      description,
      images: [{ url: image, alt: issueTitle(issue) }],
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      site: "@hashtaglocal_",
      title,
      description,
      images: [image],
    },
  };
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
