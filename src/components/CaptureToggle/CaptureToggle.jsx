import { IconButton } from "../IconButton/IconButton.jsx";

// Play/pause for mic capture: shows "pause" while capturing, "play" while stopped.
export const CaptureToggle = ({ capturing, onToggle }) => {
  let label = "Resume capture";

  if (capturing) {
    label = "Pause capture";
  }

  return (
    <IconButton label={label} onClick={onToggle}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        {capturing ? (
          <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
        ) : (
          <path d="M8 5.5v13l11-6.5z" />
        )}
      </svg>
    </IconButton>
  );
};
