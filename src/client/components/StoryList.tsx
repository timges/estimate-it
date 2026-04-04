import type { Story } from "../../shared/types";
import styles from "./StoryList.module.css";

interface StoryListProps {
  stories: Story[];
}

const STATUS_ORDER: Story["status"][] = ["active", "revealed", "pending", "done"];
const STATUS_LABELS: Record<Story["status"], string> = {
  active: "Active",
  revealed: "Revealed",
  pending: "Pending",
  done: "Done",
};

export default function StoryList({ stories }: StoryListProps) {
  if (stories.length === 0) return null;

  const grouped = new Map<Story["status"], Story[]>();
  for (const s of stories) {
    if (!grouped.has(s.status)) grouped.set(s.status, []);
    grouped.get(s.status)!.push(s);
  }

  return (
    <div className={styles.list}>
      <div className={styles.heading}>Stories</div>
      {STATUS_ORDER.map((status) => {
        const group = grouped.get(status);
        if (!group || group.length === 0) return null;
        return (
          <div key={status} className={styles.group}>
            <div className={`${styles.statusBadge} ${styles[status]}`}>
              {STATUS_LABELS[status]}
            </div>
            {group.map((story) => (
              <div key={story.id} className={styles.item}>
                <span className={styles.title}>{story.title}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
