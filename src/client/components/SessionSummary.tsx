import type { Story } from "../../shared/types";
import { summarize } from "../../shared/estimates";
import styles from "./SessionSummary.module.css";

interface SessionSummaryProps {
  stories: Story[];
}

export default function SessionSummary({ stories }: SessionSummaryProps) {
  const { totalPoints, unanimousCount } = summarize(stories);

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
                s.unanimous === false ? styles.rowValueContested : ""
              }`}
            >
              {s.finalEstimate ?? "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
