import { useCallback, useEffect, useState } from "react";

// Lists audio input devices and keeps the list fresh when devices are plugged/unplugged.
// Device labels are empty until the user grants mic permission, so call refresh()
// again after the first getUserMedia succeeds.
export const useAudioInputs = () => {
  const [devices, setDevices] = useState([]);

  const refresh = useCallback(async () => {
    const all = await navigator.mediaDevices.enumerateDevices();

    setDevices(all.filter((d) => d.kind === "audioinput"));
  }, []);

  useEffect(() => {
    refresh();
    navigator.mediaDevices.addEventListener("devicechange", refresh);

    return () => navigator.mediaDevices.removeEventListener("devicechange", refresh);
  }, [refresh]);

  return { devices, refresh };
};
