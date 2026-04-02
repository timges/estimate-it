import type { Participant } from "../../shared/types";
import styles from "./ParticipantList.module.css";

interface ParticipantListProps {
  participants: Participant[];
}

export default function ParticipantList({
  participants,
}: ParticipantListProps) {
  return (
    <div className={styles.sidebar}>
      <h3 className={styles.heading}>
        Participants ({participants.length})
      </h3>
      <div className={styles.list}>
        {participants.map((p) => (
          <div key={p.id} className={styles.participant}>
            <div
              className={styles.avatar}
              style={{ background: p.color + "22", color: p.color }}
            >
              {p.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className={styles.info}>
              <div className={styles.name}>{p.displayName}</div>
              <div
                className={`${styles.status} ${p.hasEstimated ? styles.voted : ""}`}
              >
                {p.hasEstimated ? "✓ estimated" : "picking..."}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
