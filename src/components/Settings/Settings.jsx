import { useEffect, useRef, useState } from "react";
import { IconButton } from "../IconButton/IconButton.jsx";
import { useSettings } from "../../context/SettingsContext.jsx";
import { ADVANCED_SETTINGS } from "../../defines/settings.js";
import styles from "./Settings.module.css";

const THRESHOLD_MIN = -60; // dBFS
const THRESHOLD_MAX = -1;
const CHART_MAX_MIN = -40;
const CHART_MAX_MAX = 0;

// `value` is audioMotion-analyzer's `mode` option (octave-band modes 3-8); labels give the
// resulting number of bones. Modes 1-2 (240/120 bands) are too narrow to fit a bone.
const MODES = [
  { value: 8, label: "10 bones (full octave)" },
  { value: 7, label: "20 bones (1/2 octave)" },
  { value: 6, label: "30 bones (1/3 octave)" },
  { value: 5, label: "40 bones (1/4 octave)" },
  { value: 4, label: "60 bones (1/6 octave)" },
  { value: 3, label: "80 bones (1/8 octave)" },
];

// Gear button that opens the settings flyout; placed in the top-right toolbar by App.
export const Settings = ({ devices, deviceId, onDeviceChange }) => {
  const { settings, set, reset } = useSettings();
  const { mode, threshold, chartMaxDb, showThreshold, showVolume } = settings;
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Close on outside click or Escape.
  useEffect(() => {
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    let cleanup;

    if (open) {
      document.addEventListener("pointerdown", onPointerDown);
      document.addEventListener("keydown", onKeyDown);

      cleanup = () => {
        document.removeEventListener("pointerdown", onPointerDown);
        document.removeEventListener("keydown", onKeyDown);
      };
    }

    return cleanup;
  }, [open]);

  return (
    <div ref={rootRef} className={styles.root}>
      <IconButton label="Settings" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="3" strokeWidth="2" />
          <path
            strokeWidth="2"
            strokeLinejoin="round"
            d="M10.3 2.5h3.4l.5 2.4 1.7.7 2.1-1.3 2.4 2.4-1.3 2.1.7 1.7 2.4.5v3.4l-2.4.5-.7 1.7 1.3 2.1-2.4 2.4-2.1-1.3-1.7.7-.5 2.4h-3.4l-.5-2.4-1.7-.7-2.1 1.3-2.4-2.4 1.3-2.1-.7-1.7-2.4-.5v-3.4l2.4-.5.7-1.7-1.3-2.1 2.4-2.4 2.1 1.3 1.7-.7z"
          />
        </svg>
      </IconButton>

      {open && (
        <div className={styles.flyout} role="dialog" aria-label="Settings">
          <label className={styles.field}>
            Input device
            <select value={deviceId} onChange={(e) => onDeviceChange(e.target.value)}>
              <option value="">Default input</option>
              {devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Input ${i + 1}`}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            Visualization
            <select value={mode} onChange={(e) => set("mode", Number(e.target.value))}>
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            Scream threshold: {threshold} dB
            <input
              type="range"
              min={THRESHOLD_MIN}
              max={THRESHOLD_MAX}
              value={threshold}
              onChange={(e) => set("threshold", Number(e.target.value))}
            />
          </label>

          <label className={styles.field}>
            Graph maximum: {chartMaxDb} dB
            <input
              type="range"
              min={CHART_MAX_MIN}
              max={CHART_MAX_MAX}
              value={chartMaxDb}
              onChange={(e) => set("chartMaxDb", Number(e.target.value))}
            />
          </label>

          <label className={styles.check}>
            <input
              type="checkbox"
              checked={showThreshold}
              onChange={(e) => set("showThreshold", e.target.checked)}
            />
            Show threshold bar
          </label>

          <label className={styles.check}>
            <input
              type="checkbox"
              checked={showVolume}
              onChange={(e) => set("showVolume", e.target.checked)}
            />
            Show volume bar
          </label>

          <details className={styles.advanced}>
            <summary>Advanced</summary>
            {ADVANCED_SETTINGS.map((group) => (
              <fieldset key={group.group} className={styles.group}>
                <legend>{group.group}</legend>
                {group.items.map((item) => (
                  <label key={item.key} className={styles.field}>
                    {item.label}: {settings[item.key]}
                    {item.unit && ` ${item.unit}`}
                    <input
                      type="range"
                      min={item.min}
                      max={item.max}
                      step={item.step}
                      value={settings[item.key]}
                      onChange={(e) => set(item.key, Number(e.target.value))}
                    />
                  </label>
                ))}
              </fieldset>
            ))}
            <button type="button" className={styles.reset} onClick={reset}>
              Reset all to defaults
            </button>
          </details>
        </div>
      )}
    </div>
  );
};
