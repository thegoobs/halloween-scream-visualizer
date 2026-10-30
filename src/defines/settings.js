// Every user-tunable setting, with its default. SettingsContext loads/saves these, clamping
// numbers to the ranges in ADVANCED_SETTINGS. Add a lever here and it persists automatically.
export const DEFAULT_SETTINGS = {
  // Basic (shown at the top of the settings flyout)
  mode: 6, // audioMotion mode 6 = 1/3 octave bands (30 bones), like a mixer RTA
  threshold: -20, // dBFS a scream must reach
  chartMaxDb: 0, // dBFS at the top of the graph; lower it to zoom in on quieter screams
  showThreshold: true,
  showVolume: true,

  // Advanced
  boneHoldMs: 500, // how long a bone stays at its top before dropping
  boneFallMs: 125, // time constant of the drop (larger = slower)
  analyzerSmoothing: 0.7, // audioMotion smoothing; slows both rise and fall of the raw bands
  orangeRampDb: 25, // bones fade cream -> orange over this many dB below the threshold
  wiggleDeg: 1, // max wiggle angle of bones nearing the threshold (0 = off)
  wiggleHz: 6, // wiggle speed
  volumeAttackMs: 120, // volume line smoothing, rising
  volumeReleaseMs: 450, // volume line smoothing, falling
  screamHoldMs: 50, // how long the volume must stay above the threshold
  popupMs: 4000, // how long the reward popup stays up
  cooldownMs: 2000, // quiet period after a popup before the next can fire
};

// Slider definitions for the Advanced section, grouped by heading.
export const ADVANCED_SETTINGS = [
  {
    group: "Bone animation",
    items: [
      { key: "boneHoldMs", label: "Bone hold", min: 0, max: 3000, step: 50, unit: "ms" },
      { key: "boneFallMs", label: "Bone fall time", min: 50, max: 1000, step: 50, unit: "ms" },
      { key: "analyzerSmoothing", label: "Raw smoothing", min: 0, max: 0.95, step: 0.05, unit: "" },
      { key: "wiggleDeg", label: "Wiggle angle", min: 0, max: 1, step: 0.1, unit: "°" },
      { key: "wiggleHz", label: "Wiggle speed", min: 1, max: 10, step: 1, unit: "Hz" },
      { key: "orangeRampDb", label: "Orange fade range", min: 1, max: 60, step: 1, unit: "dB" },
    ],
  },
  {
    group: "Volume line",
    items: [
      { key: "volumeAttackMs", label: "Rise smoothing", min: 0, max: 1000, step: 10, unit: "ms" },
      { key: "volumeReleaseMs", label: "Fall smoothing", min: 0, max: 2000, step: 10, unit: "ms" },
    ],
  },
  {
    group: "Scream reward",
    items: [
      {
        key: "screamHoldMs",
        label: "Hold above threshold",
        min: 0,
        max: 1000,
        step: 10,
        unit: "ms",
      },
      { key: "popupMs", label: "Popup duration", min: 1000, max: 15000, step: 500, unit: "ms" },
      { key: "cooldownMs", label: "Cooldown", min: 0, max: 10000, step: 500, unit: "ms" },
    ],
  },
];
