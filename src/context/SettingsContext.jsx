import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ADVANCED_SETTINGS, DEFAULT_SETTINGS } from "../defines/settings.js";

const STORAGE_KEY = "scream-settings";
const RANGES = Object.fromEntries(
  ADVANCED_SETTINGS.flatMap((g) => g.items).map((i) => [i.key, [i.min, i.max]]),
);

const SettingsContext = createContext(null);

// Keep only known keys whose type matches the default; clamp slider values to their range.
const sanitize = (raw) => {
  const out = {};

  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    const v = raw?.[key];
    const range = RANGES[key];
    const valid = typeof v === typeof def && (typeof v !== "number" || Number.isFinite(v));

    if (valid) {
      out[key] = v;

      if (range) {
        out[key] = Math.min(range[1], Math.max(range[0], v));
      }
    }
  }

  return out;
};

const load = () => {
  const flag = (k) => localStorage.getItem(k) !== "false";
  let result = DEFAULT_SETTINGS;
  let saved = null;
  let threshold = 0;
  let legacy = {};

  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (saved) {
      result = { ...DEFAULT_SETTINGS, ...sanitize(saved) };
    } else {
      // Carry over values saved by earlier versions, which used one key per setting.
      threshold = Number(localStorage.getItem("scream-threshold"));
      legacy = { showThreshold: flag("show-threshold"), showVolume: flag("show-volume") };

      if (threshold < 0) {
        legacy.threshold = threshold;
      }

      result = { ...DEFAULT_SETTINGS, ...sanitize(legacy) };
    }
  } catch {
    result = DEFAULT_SETTINGS;
  }

  return result;
};

// Holds every tunable (see defines/settings.js) so any component can read or change them
// without prop drilling, and persists them in localStorage.
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(load);
  const set = useCallback((key, value) => setSettings((s) => ({ ...s, [key]: value })), []);
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);
  const value = useMemo(() => ({ settings, set, reset }), [settings, set, reset]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);

  if (!ctx) {
    throw new Error("useSettings must be used inside <SettingsProvider>");
  }

  return ctx;
};
