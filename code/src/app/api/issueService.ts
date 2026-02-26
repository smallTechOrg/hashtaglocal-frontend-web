import { UpdateIssueRequest } from "../models/issue";
import { API_PATHS } from "../constants/api";

export async function updateIssue(
  issueId: number,
  updates: UpdateIssueRequest
): Promise<void> {
  const response = await fetch(API_PATHS.issue(issueId), {
    method: "PATCH",
    headers: {
      "accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update issue: ${response.status} ${response.statusText}`);
  }
}
