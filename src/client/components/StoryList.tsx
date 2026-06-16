import { useState } from "react";
import type { Story } from "../../shared/types";
import styles from "./StoryList.module.css";

interface StoryListProps {
  stories: Story[];
  onEditStory: (id: number, title: string, description: string) => void;
  onDeleteStory: (id: number) => void;
}

const STATUS_ORDER: Story["status"][] = ["active", "revealed", "pending", "done"];
const STATUS_LABELS: Record<Story["status"], string> = {
  active: "Active",
  revealed: "Revealed",
  pending: "Pending",
  done: "Done",
};

export default function StoryList({
  stories,
  onEditStory,
  onDeleteStory,
}: StoryListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  if (stories.length === 0) return null;

  const startEdit = (story: Story) => {
    setEditingId(story.id);
    setEditTitle(story.title);
    setEditDescription(story.description);
    setConfirmingId(null);
  };

  const saveEdit = (id: number) => {
    if (!editTitle.trim()) return;
    onEditStory(id, editTitle.trim(), editDescription.trim());
    setEditingId(null);
  };

  const grouped = new Map<Story["status"], Story[]>();
  for (const s of stories) {
    if (!grouped.has(s.status)) grouped.set(s.status, []);
    grouped.get(s.status)!.push(s);
  }

  return (
    <div className={styles.list}>
      <h3 className={styles.heading}>Stories</h3>
      {STATUS_ORDER.map((status) => {
        const group = grouped.get(status);
        if (!group || group.length === 0) return null;
        return (
          <div key={status} className={styles.group}>
            <div className={`${styles.statusBadge} ${styles[status]}`}>
              {STATUS_LABELS[status]}
            </div>
            {group.map((story) =>
              editingId === story.id ? (
                <div key={story.id} className={styles.item}>
                  <input
                    className={styles.editInput}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    aria-label={`Title for ${story.title}`}
                    autoFocus
                  />
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => saveEdit(story.id)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div key={story.id} className={styles.item}>
                  <span className={styles.title}>{story.title}</span>
                  {confirmingId === story.id ? (
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label={`Confirm delete ${story.title}`}
                        onClick={() => {
                          onDeleteStory(story.id);
                          setConfirmingId(null);
                        }}
                      >
                        Delete?
                      </button>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label={`Cancel delete ${story.title}`}
                        onClick={() => setConfirmingId(null)}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label={`Edit ${story.title}`}
                        onClick={() => startEdit(story)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label={`Delete ${story.title}`}
                        onClick={() => setConfirmingId(story.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
