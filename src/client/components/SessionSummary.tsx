import { useState } from "react";
import type { Story } from "../../shared/types";
import { summarize, summaryMarkdown } from "../../shared/estimates";
import styles from "./SessionSummary.module.css";

interface SessionSummaryProps {
  stories: Story[];
}

export default function SessionSummary({ stories }: SessionSummaryProps) {
  const { totalPoints, unanimousCount } = summarize(stories);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summaryMarkdown(stories));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={styles.summary}>
      <div className={styles.head}>
        <h2 className={styles.heading}>Session complete</h2>
        <span className={styles.count}>{stories.length} stories</span>
      </div>

      <div className={styles.totals}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{totalPoints}</div>
          <div className={styles.statLabel}>total points</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValueGreen}>{unanimousCount}</div>
          <div className={styles.statLabel}>unanimous</div>
        </div>
      </div>

      <div className={styles.rows}>
        {stories.map((s) => (
          <div key={s.id} className={styles.row}>
            <span className={styles.rowTitle}>{s.title}</span>
            <span
              className={`${styles.rowValue} ${
                s.unanimous ? "" : styles.rowValueContested
              }`}
            >
              {s.finalEstimate ?? "—"}
            </span>
          </div>
        ))}
      </div>

      <button className={styles.copyBtn} onClick={handleCopy}>
        {copied ? "Copied" : "Copy summary"}
      </button>
    </div>
  );
}
