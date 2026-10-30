import { useEffect, useRef, useState } from "react";
import AudioMotionAnalyzer from "audiomotion-analyzer";
import { LevelMeter } from "../LevelMeter/LevelMeter.jsx";
import { drawBars, setAnimation, setLevelLine, setThreshold } from "../../drawBars.js";
import { useSettings } from "../../context/SettingsContext.jsx";
import styles from "./Visualizer.module.css";

// Spectrum analyzer (audioMotion-analyzer) + level meter fed from the same MediaStream.
// Visual options come in via `options`; the animation levers come from SettingsContext.
export const Visualizer = ({ stream, options, onLevel }) => {
  const { settings } = useSettings();
  const {
    threshold,
    showThreshold,
    showVolume,
    boneHoldMs,
    boneFallMs,
    orangeRampDb,
    wiggleDeg,
    wiggleHz,
    volumeAttackMs,
    volumeReleaseMs,
  } = settings;
  const containerRef = useRef(null);
  const analyzerRef = useRef(null);
  const smoothedRef = useRef(null); // smoothed overall level in dB; null when idle
  const lastAtRef = useRef(0); // timestamp of the last level update
  const [audioCtx, setAudioCtx] = useState(null);
  let meterThreshold = null;

  if (showThreshold) {
    meterThreshold = threshold;
  }

  // One smoothed level feeds both the chart line and the scream trigger, so the trigger fires
  // on exactly what the purple line shows (raw RMS flickers frame to frame, and a scream's
  // brief dips would keep resetting the hold timer).
  const handleLevel = (db, now) => {
    const prev = smoothedRef.current;
    let level = db;
    let tau = volumeReleaseMs;
    let k = 1;

    if (prev != null) {
      if (db > prev) {
        tau = volumeAttackMs;
      }

      if (tau > 0) {
        k = 1 - Math.exp(-(now - lastAtRef.current) / tau);
      }

      level = prev + (db - prev) * k;
    }

    smoothedRef.current = level;
    lastAtRef.current = now;

    if (showVolume) {
      setLevelLine(level);
    } else {
      setLevelLine(null);
    }

    onLevel(level, now);
  };

  // Create the analyzer once.
  useEffect(() => {
    const am = new AudioMotionAnalyzer(containerRef.current, {
      connectSpeakers: false, // never play the mic back out (feedback!)
      useCanvas: false, // analysis only; bars are drawn by drawBars as SVG paths
      onCanvasDraw: drawBars,
      ...options,
    });

    // With useCanvas: false audioMotion keeps its canvas detached; attach it so
    // drawBars (onCanvasDraw) can paint into it.
    containerRef.current.appendChild(am.canvas);
    analyzerRef.current = am;
    setAudioCtx(am.audioCtx);

    return () => {
      am.destroy();
      analyzerRef.current = null;
      setAudioCtx(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The threshold sets where bones turn orange, and is drawn as a line when shown.
  useEffect(() => {
    setThreshold(threshold, showThreshold);
  }, [threshold, showThreshold]);

  useEffect(() => {
    setAnimation({ boneHoldMs, boneFallMs, orangeRampDb, wiggleDeg, wiggleHz });
  }, [boneHoldMs, boneFallMs, orangeRampDb, wiggleDeg, wiggleHz]);

  // Drop the volume line when the mic stops.
  useEffect(
    () => () => {
      smoothedRef.current = null;
      setLevelLine(null);
    },
    [stream],
  );

  // Apply option changes live.
  useEffect(() => {
    analyzerRef.current?.setOptions(options);
  }, [options]);

  // Autoplay policy can leave the AudioContext suspended without a user gesture;
  // resume it on the first interaction.
  useEffect(() => {
    const resume = () => analyzerRef.current?.audioCtx.resume();

    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);

    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, []);

  // Wire the stream into the analyzer whenever it changes.
  useEffect(() => {
    const am = analyzerRef.current;
    let source = null;
    let cleanup;

    if (am && stream) {
      am.audioCtx.resume();
      source = am.audioCtx.createMediaStreamSource(stream);
      am.connectInput(source);

      cleanup = () => {
        am.disconnectInput(source, true);
      };
    }

    return cleanup;
  }, [stream]);

  return (
    <div className={styles.viz}>
      <div ref={containerRef} className={styles.spectrum} />
      <LevelMeter
        audioCtx={audioCtx}
        stream={stream}
        threshold={meterThreshold}
        onLevel={handleLevel}
      />
    </div>
  );
};
