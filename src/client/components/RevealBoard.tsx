import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type {
  Estimate,
  RevealResult,
  Participant,
  FibonacciValue,
} from "../../shared/types";
import { FIBONACCI_VALUES } from "../../shared/types";
import { suggestFinalEstimate } from "../../shared/estimates";
import { useConsensusCelebration } from "./useConsensusCelebration";
import styles from "./RevealBoard.module.css";

interface RevealBoardProps {
  estimates: Estimate[];
  revealResult: RevealResult | null;
  participants: Participant[];
  onReVote: () => void;
  onNextStory: () => void;
  hasNextStory: boolean;
  hasActiveStory: boolean;
  finalEstimate: FibonacciValue | null;
  onSetFinalEstimate: (value: FibonacciValue) => void;
}

const MAX_DOTS_PER_ROW = 8;

export default function RevealBoard({
  estimates,
  revealResult,
  participants,
  onReVote,
  onNextStory,
  hasNextStory,
  hasActiveStory,
  finalEstimate,
  onSetFinalEstimate,
}: RevealBoardProps) {
  const shouldReduceMotion = useReducedMotion();
  const estimatesRef = useRef<HTMLDivElement>(null);

  const getName = (participantId: string) =>
    participants.find((p) => p.id === participantId)?.displayName ?? "?";

  const getColor = (participantId: string) =>
    participants.find((p) => p.id === participantId)?.color ?? "#666";

  const sorted = [...estimates].sort(
    (a, b) => FIBONACCI_VALUES.indexOf(a.value) - FIBONACCI_VALUES.indexOf(b.value)
  );

  const allAgree = revealResult?.allAgree ?? false;
  const agreedValue = allAgree
    ? sorted.find((e) => e.value !== "☕")?.value
    : undefined;

  const suggestion = suggestFinalEstimate(estimates.map((e) => e.value));
  const selectedFinal = finalEstimate ?? suggestion;

  const distribution = revealResult?.distribution ?? [];
  const numericRows = distribution.filter((d) => d.value !== "☕");
  const abstainCount = distribution.find((d) => d.value === "☕")?.count ?? 0;

  const sortedRows = [...numericRows].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return FIBONACCI_VALUES.indexOf(a.value) - FIBONACCI_VALUES.indexOf(b.value);
  });

  const maxCount = sortedRows.length > 0 ? sortedRows[0].count : 0;
  const rowsAtMax = sortedRows.filter((r) => r.count === maxCount).length;
  const hasUniqueMax = maxCount > 0 && rowsAtMax < sortedRows.length;
  const leaderIndexSet = new Set(
    hasUniqueMax
      ? sortedRows
          .map((r, i) => (r.count === maxCount ? i : -1))
          .filter((i) => i >= 0)
      : []
  );

  const celebrationDelayMs = (0.2 + sorted.length * 0.12 + 0.3) * 1000;
  useConsensusCelebration(
    allAgree,
    estimatesRef,
    !shouldReduceMotion,
    celebrationDelayMs
  );

  const renderDots = (count: number) => {
    const visibleCount = Math.min(count, MAX_DOTS_PER_ROW);
    const overflow = count - visibleCount;
    const dots = [];
    for (let i = 0; i < visibleCount; i++) {
      dots.push(<div key={i} className={styles.distDot} />);
    }
    return { dots, overflow };
  };

  const pluralize = (n: number) => (n === 1 ? "vote" : "votes");

  return (
    <div className={styles.board}>
      <div className={styles.estimates} ref={estimatesRef}>
        {sorted.map((est, i) => {
          const color = getColor(est.participantId);
          return (
            <motion.div
              key={est.participantId}
              className={styles.slot}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: -60, scale: 0.8 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : {
                      delay: 0.2 + i * 0.12,
                      type: "spring",
                      stiffness: 400,
                      damping: 15,
                    }
              }
            >
              <div
                className={styles.estimateCard}
                style={{ borderColor: color }}
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
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { delay: 0.2 + sorted.length * 0.12 + 0.3 }
          }
        >
          {revealResult.allAgree ? (
            <div className={styles.consensus}>
              <motion.div
                className={styles.consensusValue}
                initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.6 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : {
                        delay: celebrationDelayMs / 1000,
                        type: "spring",
                        stiffness: 380,
                        damping: 14,
                      }
                }
              >
                {agreedValue}
              </motion.div>
              <span className={styles.consensusLabel}>All Agree!</span>
            </div>
          ) : (
            <div className={styles.distribution}>
              {sortedRows.map((row, i) => {
                const isLeader = leaderIndexSet.has(i);
                const ariaLabel = `${row.value}: ${row.count} ${pluralize(row.count)}${isLeader ? ", leading" : ""}`;
                const { dots, overflow } = renderDots(row.count);
                return (
                  <div
                    key={row.value}
                    className={`${styles.distRow} ${isLeader ? styles.distRowLeader : ""}`}
                    role="img"
                    aria-label={ariaLabel}
                  >
                    <span className={styles.distValue}>{row.value}</span>
                    <div className={styles.distDots}>
                      {dots}
                      {overflow > 0 && (
                        <span className={styles.distOverflow}>+{overflow}</span>
                      )}
                    </div>
                    <span className={styles.distCount}>×{row.count}</span>
                  </div>
                );
              })}
              {abstainCount > 0 && (
                <div
                  className={styles.abstainRow}
                  role="img"
                  aria-label={`Abstained: ${abstainCount}`}
                >
                  <span className={styles.abstainLabel}>☕ Abstained</span>
                  <span className={styles.abstainCount}>×{abstainCount}</span>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {hasActiveStory && (
        <div className={styles.finalEstimate}>
          <span className={styles.finalLabel}>Final estimate</span>
          <div className={styles.finalCards}>
            {FIBONACCI_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                className={`${styles.finalCard} ${
                  selectedFinal === value ? styles.finalCardSelected : ""
                }`}
                aria-label={`Final estimate ${value}`}
                aria-pressed={selectedFinal === value}
                onClick={() => onSetFinalEstimate(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      )}

      <motion.div
        className={styles.actions}
        initial={shouldReduceMotion ? {} : { opacity: 0 }}
        animate={shouldReduceMotion ? {} : { opacity: 1 }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { delay: 0.2 + sorted.length * 0.12 + 0.5 }
        }
      >
        <button className={styles.btnSecondary} onClick={onReVote}>
          Reset
        </button>
        {(hasNextStory || hasActiveStory) && (
          <button className={styles.btnPrimary} onClick={onNextStory}>
            {hasNextStory ? "Next Story" : "Wrap up"}
          </button>
        )}
      </motion.div>
    </div>
  );
}