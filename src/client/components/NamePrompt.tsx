import { useEffect, useRef, useState } from "react";
import styles from "./NamePrompt.module.css";

interface NamePromptProps {
  roomId: string;
  onSubmit: (name: string) => void;
  lockedName?: string;
}

export default function NamePrompt({ roomId, onSubmit, lockedName }: NamePromptProps) {
  const [name, setName] = useState(lockedName ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (lockedName) {
      // Skip the name prompt — auto-submit once the locked name is available.
      onSubmit(lockedName);
      return;
    }
    if (window.matchMedia("(pointer: fine)").matches) {
      inputRef.current?.focus();
    }
  }, [lockedName, onSubmit]);

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

  if (lockedName) {
    return (
      <div
        className={styles.backdrop}
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-prompt-title"
      >
        <div className={styles.card}>
          <h2 id="name-prompt-title" className={styles.title}>Join Room</h2>
          <p className={styles.roomCode}>{roomId}</p>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="John Doe"
            aria-label="Display name"
            maxLength={30}
            value={lockedName}
            readOnly
            name="displayName"
            autoComplete="name"
            spellCheck={false}
          />
          <button
            ref={joinBtnRef}
            className={styles.joinBtn}
            onClick={() => onSubmit(lockedName)}
          >
            Join
          </button>
        </div>
      </div>
    );
  }

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
          placeholder="John Doe"
          aria-label="Display name"
          maxLength={30}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          name="displayName"
          autoComplete="name"
          spellCheck={false}
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
