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

  // Crown the reveal once the staggered cards have settled.
  const celebrationDelayMs = (0.2 + sorted.length * 0.12 + 0.3) * 1000;
  useConsensusCelebration(
    allAgree,
    estimatesRef,
    !shouldReduceMotion,
    celebrationDelayMs
  );

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
                style={{
                  borderColor: color,
                  height: `${60 + FIBONACCI_VALUES.indexOf(est.value) * 12}px`,
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
              {revealResult.distribution.map((d) => {
                const maxCount = Math.max(
                  ...revealResult.distribution.map((x) => x.count)
                );
                const barWidth = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                return (
                  <div key={d.value} className={styles.distRow}>
                    <span className={styles.distValue}>{d.value}</span>
                    <div className={styles.distBarTrack}>
                      <div
                        className={styles.distBar}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className={styles.distCount}>×{d.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {hasActiveStory && !revealResult?.allAgree && (
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
