import type { FibonacciValue } from "../../shared/types";
import { FIBONACCI_VALUES } from "../../shared/types";
import styles from "./CardGrid.module.css";

interface CardGridProps {
  selected: FibonacciValue | null;
  onSelect: (value: FibonacciValue) => void;
  disabled: boolean;
}

export default function CardGrid({
  selected,
  onSelect,
  disabled,
}: CardGridProps) {
  return (
    <div className={styles.wrapper}>
      <h3 className={styles.label}>Your Estimate</h3>
      <div className={styles.scene}>
        <div className={styles.table}>
          {FIBONACCI_VALUES.map((value) => (
            <button
              key={value}
              className={`${styles.card} ${selected === value ? styles.selected : ""}`}
              onClick={() => !disabled && onSelect(value)}
              disabled={disabled}
            >
              <div className={styles.cardInner}>
                <div className={styles.cardBack} />
                <div className={styles.cardFace}>{value}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
