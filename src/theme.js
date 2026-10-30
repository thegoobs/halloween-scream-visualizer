let cache = null;

// Canvas drawing can't use CSS variables directly, so read the theme roles (see theme.css)
// from the document once and hand back plain color strings.
const read = () => {
  const style = getComputedStyle(document.documentElement);
  const role = (name) => style.getPropertyValue(`--md-sys-color-${name}`).trim();

  return {
    chartBackground: role("surface-container-lowest"),
    boneOutline: role("primary-container"),
    bone: role("tertiary"),
    hot: role("primary"),
    volume: role("secondary"),
    grid: role("outline-variant"),
    label: role("on-surface-variant"),
  };
};

export const getTheme = () => {
  if (cache === null) {
    cache = read();
  }

  return cache;
};
