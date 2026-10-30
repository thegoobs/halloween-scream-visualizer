import { useEffect, useRef } from "react";
import styles from "./LevelMeter.module.css";

const MIN_DB = -60;
const PEAK_HOLD_MS = 1500;
const PEAK_FALL_DB = 0.5; // dB per frame once the hold time has passed
const FFT_SIZE = 1024;

const toDb = (v) => {
  let db = MIN_DB;

  if (v > 0) {
    db = Math.max(MIN_DB, 20 * Math.log10(v));
  }

  return db;
};

const pct = (db) => ((db - MIN_DB) / -MIN_DB) * 100;

// Mixer-style channel meter: RMS bar + peak-hold tick, in dBFS.
export const LevelMeter = ({ audioCtx, stream, threshold, onLevel }) => {
  const barRef = useRef(null);
  const peakRef = useRef(null);
  const readoutRef = useRef(null);
  // Kept in a ref so a new callback each render doesn't restart the audio loop.
  const onLevelRef = useRef(onLevel);

  onLevelRef.current = onLevel;

  useEffect(() => {
    let cleanup;

    if (audioCtx && stream) {
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      const buf = new Float32Array(FFT_SIZE);
      let peakHold = MIN_DB;
      let peakAt = 0;
      let raf = 0;

      analyser.fftSize = FFT_SIZE;
      source.connect(analyser);

      const tick = (now) => {
        let sum = 0;
        let peak = 0;
        let rmsDb = MIN_DB;
        let peakDb = MIN_DB;

        analyser.getFloatTimeDomainData(buf);

        for (let i = 0; i < buf.length; i++) {
          const a = Math.abs(buf[i]);

          sum += buf[i] * buf[i];

          if (a > peak) {
            peak = a;
          }
        }

        rmsDb = toDb(Math.sqrt(sum / buf.length));
        peakDb = toDb(peak);
        onLevelRef.current?.(rmsDb, now);

        if (peakDb >= peakHold) {
          peakHold = peakDb;
          peakAt = now;
        } else if (now - peakAt > PEAK_HOLD_MS) {
          peakHold = Math.max(MIN_DB, peakHold - PEAK_FALL_DB); // fall after the hold time
        }

        barRef.current.style.width = `${pct(rmsDb)}%`;
        peakRef.current.style.left = `${pct(peakHold)}%`;
        readoutRef.current.textContent = `${rmsDb.toFixed(1)} dB (peak ${peakHold.toFixed(1)})`;
        raf = requestAnimationFrame(tick);
      };

      raf = requestAnimationFrame(tick);

      cleanup = () => {
        cancelAnimationFrame(raf);
        source.disconnect();
        analyser.disconnect();
      };
    }

    return cleanup;
  }, [audioCtx, stream]);

  return (
    <div className={styles.meter}>
      <div className={styles.track}>
        <div ref={barRef} className={styles.bar} />
        <div ref={peakRef} className={styles.peak} />
        {threshold != null && (
          <div className={styles.threshold} style={{ left: `${pct(threshold)}%` }} />
        )}
      </div>
      <span ref={readoutRef} className={styles.readout}>
        -60.0 dB
      </span>
    </div>
  );
};
