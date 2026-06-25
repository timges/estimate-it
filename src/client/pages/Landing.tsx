import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateRoomCode } from "../../shared/dictionary";
import { useAuthStore } from "../store/auth";
import AccountBadge from "../components/AccountBadge";
import GithubLogin from "../components/GithubLogin";
import SeoContent from "../components/SeoContent";
import styles from "./Landing.module.css";

export default function Landing() {
  const navigate = useNavigate();
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const { user, loading, fetchSession, login } = useAuthStore();
  const prevUserRef = useRef(user);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // When the user transitions from logged-out to logged-in, lock the display
  // name to the GitHub identity. Don't clobber an in-progress manual edit
  // when the user object re-renders for unrelated reasons.
  useEffect(() => {
    if (user && !prevUserRef.current) {
      setCreateName(user.name);
      setJoinName(user.name);
    } else if (!user && prevUserRef.current) {
      setCreateName("");
      setJoinName("");
    }
    prevUserRef.current = user;
  }, [user]);

  const handleCreate = () => {
    if (!createName.trim()) return;
    const code = generateRoomCode();
    localStorage.setItem("displayName", createName.trim());
    localStorage.setItem("roomAction", "create");
    navigate(`/room/${code}`);
  };

  const handleJoin = () => {
    if (!joinCode.trim() || !joinName.trim()) return;
    localStorage.setItem("displayName", joinName.trim());
    localStorage.setItem("roomAction", "join");
    navigate(`/room/${joinCode.trim().toLowerCase()}`);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        estimate-it<span className={styles.dot}>.</span>
      </h1>
      <p className={styles.subtitle}>Bias-free story estimation</p>

      {!loading && !user && <GithubLogin onLogin={login} />}
      {!loading && user && <AccountBadge />}

      <div className={styles.card}>
        <div className={styles.label}>Create a Room</div>
        <label className={styles.label} htmlFor="create-name">
          Your Display Name
        </label>
        <input
          id="create-name"
          className={styles.input}
          placeholder="John Doe"
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          name="displayName"
          autoComplete="name"
          spellCheck={false}
          readOnly={!!user}
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
        <label className={styles.label} htmlFor="join-code">
          Room Code
        </label>
        <input
          id="join-code"
          className={styles.input}
          placeholder="Room code (e.g. coral-falcon)…"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          name="roomCode"
          autoComplete="off"
          spellCheck={false}
        />
        <label className={styles.label} htmlFor="join-name">
          Your Display Name
        </label>
        <input
          id="join-name"
          className={styles.input}
          placeholder="John Doe"
          value={joinName}
          onChange={(e) => setJoinName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          name="displayName"
          autoComplete="name"
          spellCheck={false}
          readOnly={!!user}
        />
        <button
          className={styles.btnSecondary}
          onClick={handleJoin}
          disabled={!joinCode.trim() || !joinName.trim()}
        >
          Join Room
        </button>
      </div>

      <SeoContent />
    </div>
  );
}
