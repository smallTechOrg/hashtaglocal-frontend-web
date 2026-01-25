import { UpdateIssueRequest } from "../models/issue";

const API_BASE_URL = "https://staging.api.smalltech.in/local/api/v1";

export async function updateIssue(
  issueId: number,
  updates: UpdateIssueRequest
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/issue/${issueId}`, {
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
