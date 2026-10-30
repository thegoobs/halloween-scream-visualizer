import styles from "./IconButton.module.css";

// Round floating-toolbar button. `label` is the accessible name; extra props (e.g.
// aria-expanded) pass through to the <button>.
export const IconButton = ({ label, onClick, children, ...rest }) => {
  return (
    <button className={styles.button} onClick={onClick} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
};
