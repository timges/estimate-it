import { useState } from "react";
import { Link } from "react-router-dom";
import type { Story } from "../../shared/types";
import { summarize } from "../../shared/estimates";
import Modal from "./Modal";
import styles from "./SessionSummary.module.css";

interface SessionSummaryProps {
  stories: Story[];
  onNewSession: () => void;
  onSelectStory: (id: number) => void;
}

export default function SessionSummary({
  stories,
  onNewSession,
  onSelectStory,
}: SessionSummaryProps) {
  const { totalPoints, unanimousCount } = summarize(stories);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleConfirmReset() {
    onNewSession();
    setShowConfirm(false);
  }

  return (
    <>
      <div className={styles.summary}>
        <div className={styles.head}>
          <h2 className={styles.heading}>Session complete</h2>
          <span className={styles.count}>
            {stories.length} {stories.length === 1 ? "story" : "stories"}
          </span>
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
            <button
              key={s.id}
              type="button"
              className={styles.row}
              onClick={() => onSelectStory(s.id)}
            >
              <span className={styles.rowTitle}>{s.title}</span>
              <span
                className={`${styles.rowValue} ${
                  s.unanimous === false ? styles.rowValueContested : ""
                }`}
              >
                {s.finalEstimate ?? "—"}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.actions}>
          <Link to="/" className={styles.homeLink}>
            Home
          </Link>
          <button
            type="button"
            className={styles.newSessionBtn}
            onClick={() => setShowConfirm(true)}
          >
            New Session
          </button>
        </div>
      </div>

      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Start a new session?"
      >
        <p className={styles.confirmMessage}>
          All stories and votes will be cleared. Participants stay connected.
        </p>
        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.modalCancel}
            onClick={() => setShowConfirm(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.modalDelete}
            onClick={handleConfirmReset}
          >
            New Session
          </button>
        </div>
      </Modal>
    </>
  );
}
