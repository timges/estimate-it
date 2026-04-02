import { useState } from "react";
import styles from "./AddStory.module.css";

interface AddStoryProps {
  onAdd: (title: string, description: string) => void;
}

export default function AddStory({ onAdd }: AddStoryProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), description.trim());
    setTitle("");
    setDescription("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button className={styles.trigger} onClick={() => setOpen(true)}>
        + Add Story
      </button>
    );
  }

  return (
    <div className={styles.form}>
      <input
        className={styles.input}
        placeholder="Story title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <textarea
        className={styles.textarea}
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />
      <div className={styles.actions}>
        <button className={styles.cancel} onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button
          className={styles.submit}
          onClick={handleSubmit}
          disabled={!title.trim()}
        >
          Add
        </button>
      </div>
    </div>
  );
}
