export interface ParsedIssueUrl {
  owner: string;
  repo: string;
  number: number;
  url: string;
}

export interface ParseResult {
  valid: ParsedIssueUrl[];
  errors: { url: string; error: string }[];
}

const ISSUE_URL_PATTERN =
  /^https?:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)\/issues\/(\d+)\/?$/;

export function parseGitHubIssueUrls(text: string): ParseResult {
  const lines = text
    .split(/[\n\r\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const valid: ParsedIssueUrl[] = [];
  const errors: { url: string; error: string }[] = [];

  for (const line of lines) {
    const match = line.match(ISSUE_URL_PATTERN);
    if (match) {
      const [, owner, repo, numStr] = match;
      const number = parseInt(numStr, 10);
      if (number > 0) {
        valid.push({ owner, repo, number, url: line });
      } else {
        errors.push({ url: line, error: "Invalid issue number" });
      }
    } else {
      errors.push({ url: line, error: "Not a valid GitHub issue URL" });
    }
  }

  return { valid, errors };
}
