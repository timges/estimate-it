import { useState } from "react";
import type { Story } from "../../shared/types";
import styles from "./StorySpotlight.module.css";

interface StorySpotlightProps {
  story: Story;
  position: number;
  total: number;
}

const LONG_DESCRIPTION_CHARS = 140;

export default function StorySpotlight({
  story,
  position,
  total,
}: StorySpotlightProps) {
  const [expanded, setExpanded] = useState(false);

  const isLong = story.description.length > LONG_DESCRIPTION_CHARS;
  const collapsed = isLong && !expanded;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.label}>Now estimating</span>
        <span className={styles.progress}>
          {position} / {total}
        </span>
      </div>
      <div className={styles.title}>{story.title}</div>
      {story.description && (
        <div
          className={`${styles.description} ${collapsed ? styles.clamped : ""}`}
        >
          {story.description}
        </div>
      )}
      {isLong && (
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
