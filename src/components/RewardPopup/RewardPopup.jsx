import styles from "./RewardPopup.module.css";

// Full-screen reward shown when a scream is detected. `reward` is { emoji, title, body }
// from defines/rewards.js. `durationMs` is how long the popup stays up; a thin bar along the
// bottom of the card drains over that time.
export const RewardPopup = ({ active, count, reward, durationMs, onDismiss }) => {
  let popup = null;

  if (active && reward) {
    popup = (
      // key restarts the entrance animation on each new trigger
      <div className={styles.backdrop} key={count} onClick={onDismiss}>
        <div className={styles.card}>
          <div className={styles.emoji}>{reward.emoji}</div>
          <h2>{reward.title}</h2>
          <p>{reward.body}</p>
          <div className={styles.timer} style={{ animationDuration: `${durationMs}ms` }} />
        </div>
      </div>
    );
  }

  return popup;
};
