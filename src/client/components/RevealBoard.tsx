import { motion } from "framer-motion";
import type {
  Estimate,
  RevealResult,
  Participant,
  FibonacciValue,
} from "../../shared/types";
import styles from "./RevealBoard.module.css";

interface RevealBoardProps {
  estimates: Estimate[];
  revealResult: RevealResult | null;
  participants: Participant[];
  onReVote: () => void;
  onNextStory: () => void;
  hasNextStory: boolean;
}

const FIB_ORDER = ["1", "2", "3", "5", "8", "13", "21", "☕"];

const SEGMENT_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#f43f5e",
  "#64748b",
];

export default function RevealBoard({
  estimates,
  revealResult,
  participants,
  onReVote,
  onNextStory,
  hasNextStory,
}: RevealBoardProps) {
  const getName = (participantId: string) =>
    participants.find((p) => p.id === participantId)?.displayName ?? "?";

  const getColor = (participantId: string) =>
    participants.find((p) => p.id === participantId)?.color ?? "#666";

  const sorted = [...estimates].sort(
    (a, b) => FIB_ORDER.indexOf(a.value) - FIB_ORDER.indexOf(b.value)
  );

  const totalCount = revealResult
    ? revealResult.distribution.reduce((sum, d) => sum + d.count, 0)
    : 0;

  return (
    <div className={styles.board}>
      <motion.h3
        className={styles.title}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        All Estimates Revealed
      </motion.h3>

      <div className={styles.estimates}>
        {sorted.map((est, i) => {
          const color = getColor(est.participantId);
          return (
            <motion.div
              key={est.participantId}
              className={styles.slot}
              initial={{ opacity: 0, y: -60, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: 0.2 + i * 0.12,
                type: "spring",
                stiffness: 400,
                damping: 15,
              }}
            >
              <div
                className={styles.estimateCard}
                style={{
                  borderColor: color,
                  height: `${60 + FIB_ORDER.indexOf(est.value) * 12}px`,
                }}
              >
                {est.value}
              </div>
              <div className={styles.name} style={{ color }}>
                {getName(est.participantId)}
              </div>
            </motion.div>
          );
        })}
      </div>

      {revealResult && (
        <motion.div
          className={styles.stats}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + sorted.length * 0.12 + 0.3 }}
        >
          {revealResult.allAgree ? (
            <div className={styles.consensus}>All agree!</div>
          ) : (
            <div className={styles.distributionBar}>
              {revealResult.distribution.map((d, i) => {
                const width = totalCount > 0 ? (d.count / totalCount) * 100 : 0;
                return (
                  <div
                    key={d.value}
                    className={styles.distSegment}
                    style={{
                      width: `${width}%`,
                      backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                    }}
                  >
                    <span className={styles.distSegmentLabel}>
                      {d.value} <span className={styles.distCount}>×{d.count}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      <motion.div
        className={styles.actions}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 + sorted.length * 0.12 + 0.5 }}
      >
        <button className={styles.btnSecondary} onClick={onReVote}>
          Revote
        </button>
        {hasNextStory && (
          <button className={styles.btnPrimary} onClick={onNextStory}>
            Next Story
          </button>
        )}
      </motion.div>
    </div>
  );
}
