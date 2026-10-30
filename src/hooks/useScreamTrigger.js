import { useCallback, useEffect, useRef, useState } from "react";

// Fires a timed popup when the level stays at or above `threshold` dB for `holdMs`.
// `onLevel(db, now)` must be called every frame with the current level (see LevelMeter).
// After a popup, `cooldownMs` must pass before the next one can fire.
// `listening` is false from the trigger until the popup and cooldown are over, so the caller
// can mute the mic and let the chart settle.
export const useScreamTrigger = ({ threshold, holdMs, popupMs, cooldownMs }) => {
  const [active, setActive] = useState(false);
  const [listening, setListening] = useState(true);
  const [count, setCount] = useState(0);
  const aboveSince = useRef(null);
  const lockedUntil = useRef(0); // frame timestamp before which we ignore sound
  const timer = useRef(null);
  const listenTimer = useRef(null);

  // Closing the popup early starts the cooldown right away, instead of waiting out the
  // popup's remaining time.
  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setActive(false);
    lockedUntil.current = performance.now() + cooldownMs;
    clearTimeout(listenTimer.current);
    listenTimer.current = setTimeout(() => setListening(true), cooldownMs);
  }, [cooldownMs]);

  const onLevel = useCallback(
    (db, now) => {
      if (now >= lockedUntil.current) {
        if (db < threshold) {
          aboveSince.current = null;
        } else {
          if (aboveSince.current == null) {
            aboveSince.current = now;
          }

          if (now - aboveSince.current >= holdMs) {
            aboveSince.current = null;
            lockedUntil.current = now + popupMs + cooldownMs;
            setCount((c) => c + 1);
            setActive(true);
            setListening(false);
            clearTimeout(listenTimer.current);
            listenTimer.current = setTimeout(() => setListening(true), popupMs + cooldownMs);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setActive(false), popupMs);
          }
        }
      }
    },
    [threshold, holdMs, popupMs, cooldownMs],
  );

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(listenTimer.current);
    },
    [],
  );

  return { onLevel, active, count, dismiss, listening };
};
