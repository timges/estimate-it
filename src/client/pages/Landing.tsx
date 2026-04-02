import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateRoomCode } from "../../shared/dictionary";
import styles from "./Landing.module.css";

export default function Landing() {
  const navigate = useNavigate();
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");

  const handleCreate = () => {
    if (!createName.trim()) return;
    const code = generateRoomCode();
    localStorage.setItem("displayName", createName.trim());
    navigate(`/room/${code}`);
  };

  const handleJoin = () => {
    if (!joinCode.trim() || !joinName.trim()) return;
    localStorage.setItem("displayName", joinName.trim());
    navigate(`/room/${joinCode.trim().toLowerCase()}`);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        estimate<span className={styles.dot}>.</span>
      </h1>
      <p className={styles.subtitle}>Bias-free story estimation</p>

      <div className={styles.card}>
        <div className={styles.label}>Create a Room</div>
        <input
          className={styles.input}
          placeholder="Your display name"
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button
          className={styles.btnPrimary}
          onClick={handleCreate}
          disabled={!createName.trim()}
        >
          Create Room
        </button>
      </div>

      <div className={styles.divider}>or</div>

      <div className={styles.card}>
        <div className={styles.label}>Join a Room</div>
        <input
          className={styles.input}
          placeholder="Room code (e.g. coral-falcon)"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />
        <input
          className={styles.input}
          placeholder="Your display name"
          value={joinName}
          onChange={(e) => setJoinName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />
        <button
          className={styles.btnSecondary}
          onClick={handleJoin}
          disabled={!joinCode.trim() || !joinName.trim()}
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
