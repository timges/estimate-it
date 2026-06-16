import { useState } from "react";
import { parseStoryLines } from "../../shared/parse-stories";
import styles from "./AddStory.module.css";

interface AddStoryProps {
  onAdd: (title: string, description: string) => void;
  onAddMany: (titles: string[]) => void;
}

type Mode = "closed" | "single" | "bulk";

export default function AddStory({ onAdd, onAddMany }: AddStoryProps) {
  const [mode, setMode] = useState<Mode>("closed");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bulkText, setBulkText] = useState("");

  const parsed = parseStoryLines(bulkText);

  const reset = () => {
    setTitle("");
    setDescription("");
    setBulkText("");
    setMode("closed");
  };

  const handleSingleSubmit = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), description.trim());
    reset();
  };

  const handleBulkSubmit = () => {
    if (parsed.length === 0) return;
    onAddMany(parsed);
    reset();
  };

  if (mode === "closed") {
    return (
      <button className={styles.trigger} onClick={() => setMode("single")}>
        + Add Story
      </button>
    );
  }

  return (
    <div className={styles.form}>
      <div className={styles.modeTabs}>
        <button
          className={mode === "single" ? styles.tabActive : styles.tab}
          onClick={() => setMode("single")}
        >
          Single
        </button>
        <button
          className={mode === "bulk" ? styles.tabActive : styles.tab}
          onClick={() => setMode("bulk")}
        >
          Paste list
        </button>
      </div>

      {mode === "single" ? (
        <>
          <label className={styles.label} htmlFor="story-title">
            Story Title
          </label>
          <input
            id="story-title"
            className={styles.input}
            placeholder="Story title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus={window.matchMedia("(pointer: fine)").matches}
            name="storyTitle"
            autoComplete="off"
          />
          <label className={styles.label} htmlFor="story-description">
            Description
          </label>
          <textarea
            id="story-description"
            className={styles.textarea}
            placeholder="Description (optional)…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            name="storyDescription"
            autoComplete="off"
          />
          <div className={styles.actions}>
            <button className={styles.cancel} onClick={reset}>
              Cancel
            </button>
            <button
              className={styles.submit}
              onClick={handleSingleSubmit}
              disabled={!title.trim()}
            >
              Add
            </button>
          </div>
        </>
      ) : (
        <>
          <label className={styles.label} htmlFor="story-bulk">
            Paste issues
          </label>
          <textarea
            id="story-bulk"
            className={styles.textarea}
            placeholder="One per line…"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={6}
            name="storyBulk"
            autoComplete="off"
          />
          <div className={styles.actions}>
            <button className={styles.cancel} onClick={reset}>
              Cancel
            </button>
            <button
              className={styles.submit}
              onClick={handleBulkSubmit}
              disabled={parsed.length === 0}
            >
              Add {parsed.length || ""}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
