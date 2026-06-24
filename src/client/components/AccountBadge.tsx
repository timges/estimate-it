import { useAuthStore } from "../store/auth";
import styles from "./AccountBadge.module.css";

export default function AccountBadge() {
  const { user, logout } = useAuthStore();
  if (!user) return null;

  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className={styles.badge}>
      <div className={styles.avatar} aria-hidden="true">
        {user.image ? (
          <img src={user.image} alt="" className={styles.avatarImg} />
        ) : (
          <span className={styles.initials}>{initials}</span>
        )}
      </div>
      <span className={styles.name} title={user.name}>
        {user.name}
      </span>
      <button
        type="button"
        className={styles.signOut}
        onClick={logout}
        aria-label="Sign out"
      >
        Sign out
      </button>
    </div>
  );
}
