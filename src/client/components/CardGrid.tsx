import { useEffect } from "react";
import type { FibonacciValue } from "../../shared/types";
import { FIBONACCI_VALUES } from "../../shared/types";
import styles from "./CardGrid.module.css";

interface CardGridProps {
  selected: FibonacciValue | null;
  onSelect: (value: FibonacciValue) => void;
  onDeselect?: () => void;
  disabled: boolean;
}

export default function CardGrid({
  selected,
  onSelect,
  onDeselect,
  disabled,
}: CardGridProps) {
  useEffect(() => {
    if (!onDeselect) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selected) {
        onDeselect();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selected, onDeselect]);

  const handleClick = (value: FibonacciValue) => {
    if (disabled) return;
    if (selected === value && onDeselect) {
      onDeselect();
    } else {
      onSelect(value);
    }
  };

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.label}>Your Estimate</h3>
      <div className={styles.grid}>
        {FIBONACCI_VALUES.map((value) => (
          <button
            key={value}
            className={`${styles.card} ${selected === value ? styles.selected : ""}`}
            onClick={() => handleClick(value)}
            disabled={disabled}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
