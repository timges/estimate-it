import { useEffect, useRef, useState } from "react";
import styles from "./NamePrompt.module.css";

interface NamePromptProps {
  roomId: string;
  onSubmit: (name: string) => void;
}

export default function NamePrompt({ roomId, onSubmit }: NamePromptProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name.trim());
  };

  const joinBtnRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim()) {
      handleSubmit();
    }
  };

  const handleBackdropKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const input = inputRef.current;
    const btn = joinBtnRef.current;
    if (!input || !btn) return;

    if (e.shiftKey && document.activeElement === input) {
      e.preventDefault();
      btn.focus();
    } else if (!e.shiftKey && document.activeElement === btn) {
      e.preventDefault();
      input.focus();
    }
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-prompt-title"
      onKeyDown={handleBackdropKeyDown}
    >
      <div className={styles.card}>
        <h2 id="name-prompt-title" className={styles.title}>Join Room</h2>
        <p className={styles.roomCode}>{roomId}</p>
        <input
          ref={inputRef}
          className={styles.input}
          placeholder="Your display name…"
          aria-label="Display name"
          maxLength={30}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          ref={joinBtnRef}
          className={styles.joinBtn}
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          Join
        </button>
      </div>
    </div>
  );
}
