import { useState, useRef, useEffect } from "react";
import type { Participant } from "../../shared/types";
import styles from "./ParticipantList.module.css";

interface ParticipantListProps {
  participants: Participant[];
  currentParticipantId: string | null;
  onRename: (newName: string) => void;
}

export default function ParticipantList({
  participants,
  currentParticipantId,
  onRename,
}: ParticipantListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleStartEdit = (p: Participant) => {
    setEditingId(p.id);
    setEditValue(p.displayName);
  };

  const handleCommit = () => {
    if (editValue.trim() && editingId) {
      onRename(editValue.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCommit();
    if (e.key === "Escape") setEditingId(null);
  };

  return (
    <div className={styles.sidebar}>
      <h3 className={styles.heading}>
        Participants ({participants.length})
      </h3>
      <div className={styles.list}>
        {participants.map((p) => (
          <div key={p.id} className={styles.participant} data-participant-id={p.id}>
            <div
              className={styles.avatar}
              style={{ background: p.color + "22", color: p.color }}
            >
              {p.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className={styles.info}>
              {editingId === p.id ? (
                <input
                  ref={inputRef}
                  className={styles.renameInput}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleCommit}
                  onKeyDown={handleKeyDown}
                  maxLength={30}
                />
              ) : (
                <div className={styles.nameRow}>
                  <div
                    role={p.id === currentParticipantId ? "button" : undefined}
                    tabIndex={p.id === currentParticipantId ? 0 : undefined}
                    className={`${styles.name} ${p.id === currentParticipantId ? styles.clickable : ""}`}
                    onClick={p.id === currentParticipantId ? () => handleStartEdit(p) : undefined}
                    onKeyDown={
                      p.id === currentParticipantId
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleStartEdit(p);
                            }
                          }
                        : undefined
                    }
                    title={p.id === currentParticipantId ? "Click to rename" : undefined}
                  >
                    {p.displayName}
                  </div>
                  {p.id === currentParticipantId && (
                    <svg
                      data-pencil-icon
                      role="button"
                      aria-label="Rename"
                      className={styles.pencilIcon}
                      onClick={() => handleStartEdit(p)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleStartEdit(p);
                        }
                      }}
                      tabIndex={0}
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  )}
                </div>
              )}
              <div
                className={`${styles.status} ${p.hasEstimated ? styles.voted : ""}`}
                aria-live="polite"
              >
                {p.hasEstimated ? "✓ Estimated" : "Picking…"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
