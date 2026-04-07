import type { Story } from "../../shared/types";
import styles from "./StoryCard.module.css";

interface StoryCardProps {
  story: Story | null;
}

export default function StoryCard({ story }: StoryCardProps) {
  if (story) {
    return (
      <div className={styles.card}>
        <div className={styles.label}>Current Story</div>
        <div className={styles.title}>{story.title}</div>
        {story.description && (
          <div className={styles.description}>{story.description}</div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.label}>No Story</div>
      <div className={styles.title}>Estimating…</div>
      <div className={styles.description}>
        Discuss the story verbally, then pick your estimate.
      </div>
    </div>
  );
}
