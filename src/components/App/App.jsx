import { useEffect, useMemo, useState } from "react";
import { Visualizer } from "../Visualizer/Visualizer.jsx";
import { RewardPopup } from "../RewardPopup/RewardPopup.jsx";
import { Settings } from "../Settings/Settings.jsx";
import { CaptureToggle } from "../CaptureToggle/CaptureToggle.jsx";
import { useAudioInputs } from "../../hooks/useAudioInputs.js";
import { useMicrophone } from "../../hooks/useMicrophone.js";
import { useSettings } from "../../context/SettingsContext.jsx";
import { useRewardDeck } from "../../hooks/useRewardDeck.js";
import { useScreamTrigger } from "../../hooks/useScreamTrigger.js";
import { REWARDS } from "../../defines/rewards.js";
import styles from "./App.module.css";

// Chart floor. Each bone is one frequency band, which sits 20-30 dB below the overall
// volume, so the floor is lower than the meter's -60 to let bones rise with the volume.
// The top of the chart is a setting (chartMaxDb), never allowed below the threshold line.
const CHART_MIN_DB = -80;
const CHART_MAX_LIMIT_DB = 0;
const THRESHOLD_HEADROOM_DB = 5;

export const App = () => {
  const { settings } = useSettings();
  const { mode, threshold, chartMaxDb, analyzerSmoothing, screamHoldMs, popupMs, cooldownMs } =
    settings;
  const { devices, refresh } = useAudioInputs();
  const { stream, error, start, stop } = useMicrophone();
  const [deviceId, setDeviceId] = useState("");
  const { onLevel, active, count, dismiss, listening } = useScreamTrigger({
    threshold,
    holdMs: screamHoldMs,
    popupMs,
    cooldownMs,
  });
  const reward = useRewardDeck(REWARDS, count);
  const chartMax = Math.min(
    CHART_MAX_LIMIT_DB,
    Math.max(chartMaxDb, threshold + THRESHOLD_HEADROOM_DB),
  );

  // Central place for visual styling knobs; see audioMotion-analyzer docs for the full list.
  const options = useMemo(
    () => ({
      mode,
      ledBars: false,
      showPeaks: true,
      smoothing: analyzerSmoothing,
      minDecibels: CHART_MIN_DB,
      maxDecibels: chartMax,
    }),
    [mode, analyzerSmoothing, chartMax],
  );

  const begin = async (id) => {
    const s = await start(id);

    if (s) {
      refresh(); // labels become available after permission is granted
    }
  };

  const onDeviceChange = (id) => {
    setDeviceId(id);
    begin(id);
  };

  const onToggleCapture = () => {
    if (stream) {
      stop();
    } else {
      begin(deviceId);
    }
  };

  // While the reward popup and cooldown run, mute the mic track (silence in, so the bones and
  // volume line sink to the floor). The stream stays open, so resuming is instant.
  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = listening));
  }, [stream, listening]);

  // Always on: open the default mic as soon as the app loads.
  useEffect(() => {
    begin("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.app}>
      <div className={styles.toolbar}>
        <CaptureToggle capturing={!!stream} onToggle={onToggleCapture} />
        <Settings devices={devices} deviceId={deviceId} onDeviceChange={onDeviceChange} />
      </div>

      {error && (
        <p className={styles.error}>
          {error.name}: {error.message}
          <button onClick={() => begin(deviceId)}>Retry</button>
        </p>
      )}

      <Visualizer stream={stream} options={options} onLevel={onLevel} />
      <RewardPopup
        active={active}
        count={count}
        reward={reward}
        durationMs={popupMs}
        onDismiss={dismiss}
      />
    </main>
  );
};
