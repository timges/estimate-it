import { useState } from "react";
import type { Story } from "../../shared/types";
import Modal from "./Modal";
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
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deletingStory, setDeletingStory] = useState<Story | null>(null);

  if (stories.length === 0) return null;

  const openEdit = (story: Story) => {
    setEditingStory(story);
    setEditTitle(story.title);
    setEditDescription(story.description);
  };

  const closeEdit = () => {
    setEditingStory(null);
    setEditTitle("");
    setEditDescription("");
  };

  const saveEdit = () => {
    if (!editingStory || !editTitle.trim()) return;
    onEditStory(editingStory.id, editTitle.trim(), editDescription.trim());
    closeEdit();
  };

  const openDelete = (story: Story) => {
    setDeletingStory(story);
  };

  const closeDelete = () => {
    setDeletingStory(null);
  };

  const confirmDelete = () => {
    if (!deletingStory) return;
    onDeleteStory(deletingStory.id);
    closeDelete();
  };

  const grouped = new Map<Story["status"], Story[]>();
  for (const s of stories) {
    if (!grouped.has(s.status)) grouped.set(s.status, []);
    grouped.get(s.status)!.push(s);
  }

  return (
    <>
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
              {group.map((story) => (
                <div key={story.id} className={styles.item}>
                  <span className={styles.title}>{story.title}</span>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label={`Edit ${story.title}`}
                      onClick={() => openEdit(story)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label={`Delete ${story.title}`}
                      onClick={() => openDelete(story)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <Modal isOpen={editingStory !== null} onClose={closeEdit} title="Edit Story">
        <label className={styles.modalLabel} htmlFor="edit-story-title">
          Story Title
        </label>
        <input
          id="edit-story-title"
          className={styles.modalInput}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          name="editStoryTitle"
          autoComplete="off"
        />
        <label className={styles.modalLabel} htmlFor="edit-story-description">
          Description
        </label>
        <textarea
          id="edit-story-description"
          className={styles.modalTextarea}
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          rows={3}
          name="editStoryDescription"
          autoComplete="off"
        />
        <div className={styles.modalActions}>
          <button className={styles.modalCancel} onClick={closeEdit}>
            Cancel
          </button>
          <button
            className={styles.modalSave}
            onClick={saveEdit}
            disabled={!editTitle.trim()}
          >
            Save
          </button>
        </div>
      </Modal>

      <Modal isOpen={deletingStory !== null} onClose={closeDelete} title="Delete story?">
        {deletingStory && (
          <>
            <p className={styles.deleteMessage}>
              Delete <strong>{deletingStory.title}</strong>? This cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={closeDelete}>
                Cancel
              </button>
              <button className={styles.modalDelete} onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
