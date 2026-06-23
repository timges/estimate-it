import { useCallback, useState } from "react";
import { parseGitHubIssueUrls } from "../lib/github";
import Modal from "./Modal";
import styles from "./ImportIssues.module.css";

interface ImportIssuesProps {
  onImport: (title: string, description: string, sourceUrl: string) => void;
}

interface IssueResult {
  url: string;
  ok: boolean;
  title?: string;
  body?: string;
  error?: string;
}

export default function ImportIssues({ onImport }: ImportIssuesProps) {
  const [open, setOpen] = useState(false);
  const [urlText, setUrlText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<IssueResult[]>([]);
  const [importDone, setImportDone] = useState(false);

  const parsed = parseGitHubIssueUrls(urlText);

  const reset = () => {
    setUrlText("");
    setResults([]);
    setImportDone(false);
    setLoading(false);
    setOpen(false);
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

      const data = (await res.json()) as { results: IssueResult[] };
      setResults(data.results);

      // Create stories for successful imports
      for (const result of data.results) {
        if (result.ok && result.title) {
          const description = result.body
            ? `${result.body}\n\n---\n[View on GitHub](${result.url})`
            : `[View on GitHub](${result.url})`;
          onImport(result.title, description, result.url);
        }
      }

      setImportDone(true);
    } catch {
      setResults([{ url: "Import failed", ok: false, error: "Network error" }]);
    }

    setLoading(false);
  }, [parsed.valid, onImport]);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
      >
        Import from GitHub
      </button>
      <Modal isOpen={open} onClose={reset} title="Import from GitHub">
        <label className={styles.label} htmlFor="import-urls">
          Paste issue URLs (one per line)
        </label>
        <textarea
          id="import-urls"
          className={styles.textarea}
          placeholder={"https://github.com/owner/repo/issues/1\nhttps://github.com/owner/repo/issues/2"}
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
                  <span>✗ {r.url} — {r.error}</span>
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
      </Modal>
    </>
  );
}
