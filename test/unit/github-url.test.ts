import { describe, it, expect } from "vitest";
import { parseGitHubIssueUrls } from "../../src/client/lib/github";

describe("parseGitHubIssueUrls", () => {
  it("parses a single valid URL", () => {
    const result = parseGitHubIssueUrls(
      "https://github.com/acme/app/issues/42"
    );
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]).toEqual({
      owner: "acme",
      repo: "app",
      number: 42,
      url: "https://github.com/acme/app/issues/42",
    });
    expect(result.errors).toHaveLength(0);
  });

  it("parses multiple URLs separated by newlines", () => {
    const result = parseGitHubIssueUrls(
      "https://github.com/acme/app/issues/1\nhttps://github.com/acme/app/issues/2"
    );
    expect(result.valid).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("parses URLs separated by spaces", () => {
    const result = parseGitHubIssueUrls(
      "https://github.com/a/b/issues/1 https://github.com/c/d/issues/2"
    );
    expect(result.valid).toHaveLength(2);
  });

  it("parses URLs separated by commas", () => {
    const result = parseGitHubIssueUrls(
      "https://github.com/a/b/issues/1,https://github.com/c/d/issues/2"
    );
    expect(result.valid).toHaveLength(2);
  });

  it("handles trailing slashes", () => {
    const result = parseGitHubIssueUrls(
      "https://github.com/acme/app/issues/42/"
    );
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].number).toBe(42);
  });

  it("handles http URLs", () => {
    const result = parseGitHubIssueUrls(
      "http://github.com/acme/app/issues/42"
    );
    expect(result.valid).toHaveLength(1);
  });

  it("rejects non-GitHub URLs", () => {
    const result = parseGitHubIssueUrls("https://gitlab.com/a/b/issues/1");
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe("Not a valid GitHub issue URL");
  });

  it("rejects GitHub URLs that are not issue URLs", () => {
    const result = parseGitHubIssueUrls("https://github.com/acme/app/pull/42");
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it("rejects issue number 0", () => {
    const result = parseGitHubIssueUrls(
      "https://github.com/acme/app/issues/0"
    );
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe("Invalid issue number");
  });

  it("handles empty input", () => {
    const result = parseGitHubIssueUrls("");
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("handles mixed valid and invalid URLs", () => {
    const result = parseGitHubIssueUrls(
      "https://github.com/acme/app/issues/1\nnot-a-url\nhttps://github.com/acme/app/issues/2"
    );
    expect(result.valid).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
  });

  it("handles URLs with query params", () => {
    const result = parseGitHubIssueUrls(
      "https://github.com/acme/app/issues/42?foo=bar"
    );
    // Query params make it not match the strict pattern
    expect(result.valid).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });
});
