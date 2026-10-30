import { useCallback, useEffect, useRef, useState } from "react";

// Opens/closes a MediaStream for the chosen input device.
// Browser voice processing is disabled so the meter reflects the raw signal, like a mixer.
export const useMicrophone = () => {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const start = useCallback(
    async (deviceId) => {
      let opened = null;
      let deviceConstraint;

      if (deviceId) {
        deviceConstraint = { exact: deviceId };
      }

      stop();
      setError(null);

      try {
        opened = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: deviceConstraint,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        streamRef.current = opened;
        setStream(opened);
      } catch (e) {
        setError(e);
      }

      return opened;
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  return { stream, error, start, stop };
};
