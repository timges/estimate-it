import { useCallback, useMemo, useState } from "react";
import Modal from "./Modal";
import { parseGitHubIssueUrls } from "../lib/github";
import type { IssueImportResponse, IssueImportResult } from "../../shared/types";
import styles from "./AddStory.module.css";

interface AddStoryProps {
  onAdd: (title: string, description: string, sourceUrl?: string) => void;
  hasGithubAuth: boolean;
}

type Mode = "manual" | "github";

export default function AddStory({ onAdd, hasGithubAuth }: AddStoryProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("manual");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urlText, setUrlText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<IssueImportResult[]>([]);
  const [importDone, setImportDone] = useState(false);

  const parsed = useMemo(() => parseGitHubIssueUrls(urlText), [urlText]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setUrlText("");
    setResults([]);
    setImportDone(false);
    setLoading(false);
    setMode("manual");
    setOpen(false);
  };

  const handleManualSubmit = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), description.trim());
    reset();
  };

  const handleImport = useCallback(async () => {
    if (parsed.valid.length === 0) return;
    setLoading(true);
    setResults([]);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ urls: parsed.valid.map((v) => v.url) }),
        signal: AbortSignal.timeout(25_000),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as { error?: string } | null;
        setResults([
          {
            url: "Import failed",
            ok: false,
            error: errorData?.error ?? `Server error: ${res.status}`,
          },
        ]);
        setLoading(false);
        return;
      }

      const data = (await res.json()) as IssueImportResponse;
      setResults(data.results);

      for (const result of data.results) {
        if (result.ok && result.title) {
          const body = result.body
            ? `${result.body}\n\n---\n[View on GitHub](${result.url})`
            : `[View on GitHub](${result.url})`;
          onAdd(result.title, body, result.url);
        }
      }

      setImportDone(true);
    } catch {
      setResults([{ url: "Import failed", ok: false, error: "Network error" }]);
    }

    setLoading(false);
  }, [parsed.valid, onAdd]);

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        + Add Story
      </button>
      <Modal isOpen={open} onClose={reset} title="Add Story">
        <div className={styles.modeSwitch} role="tablist" aria-label="Story source">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "manual"}
            className={`${styles.modeTab} ${mode === "manual" ? styles.modeTabActive : ""}`}
            onClick={() => setMode("manual")}
          >
            Manual
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "github"}
            className={`${styles.modeTab} ${mode === "github" ? styles.modeTabActive : ""}`}
            onClick={() => setMode("github")}
            disabled={!hasGithubAuth}
            title={hasGithubAuth ? undefined : "Sign in with GitHub to import issues"}
          >
            From GitHub
          </button>
        </div>

        {mode === "manual" ? (
          <>
            <label className={styles.label} htmlFor="story-title">
              Story Title
            </label>
            <input
              id="story-title"
              className={styles.input}
              placeholder="Story title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              name="storyTitle"
              autoComplete="off"
            />
            <label className={styles.label} htmlFor="story-description">
              Description
            </label>
            <textarea
              id="story-description"
              className={styles.textarea}
              placeholder="Description (optional)…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              name="storyDescription"
              autoComplete="off"
            />
            <div className={styles.actions}>
              <button className={styles.cancel} onClick={reset}>
                Cancel
              </button>
              <button
                className={styles.submit}
                onClick={handleManualSubmit}
                disabled={!title.trim()}
              >
                Add
              </button>
            </div>
          </>
        ) : (
          <>
            <label className={styles.label} htmlFor="import-urls">
              Paste issue URLs (one per line)
            </label>
            <textarea
              id="import-urls"
              className={styles.textarea}
              placeholder={
                "https://github.com/owner/repo/issues/1\nhttps://github.com/owner/repo/issues/2"
              }
              value={urlText}
              onChange={(e) => {
                setUrlText(e.target.value);
                setResults([]);
                setImportDone(false);
              }}
              rows={6}
              spellCheck={false}
            />

            {urlText && parsed.valid.length > 0 && !importDone && (
              <p className={styles.detected}>
                {parsed.valid.length} issue{parsed.valid.length !== 1 ? "s" : ""} detected
              </p>
            )}

            {urlText && parsed.errors.length > 0 && !importDone && (
              <div className={styles.parseErrors}>
                {parsed.errors.map((e, i) => (
                  <p key={i} className={styles.parseError}>
                    {e.url}: {e.error}
                  </p>
                ))}
              </div>
            )}

            {results.length > 0 && (
              <div className={styles.results}>
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`${styles.result} ${r.ok ? styles.resultOk : styles.resultError}`}
                  >
                    {r.ok ? (
                      <span>✓ {r.title}</span>
                    ) : (
                      <span>
                        ✗ {r.url} — {r.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className={styles.actions}>
              <button className={styles.cancel} onClick={reset}>
                {importDone ? "Close" : "Cancel"}
              </button>
              {!importDone && (
                <button
                  className={styles.submit}
                  onClick={handleImport}
                  disabled={parsed.valid.length === 0 || loading}
                >
                  {loading
                    ? "Importing…"
                    : `Import ${parsed.valid.length} Issue${parsed.valid.length !== 1 ? "s" : ""}`}
                </button>
              )}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
