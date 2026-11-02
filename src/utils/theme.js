const THEME_KEY = "sakora_theme";

export const readTheme = () =>
  localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";

export const applyTheme = (theme) => {
  const mode = theme === "dark" ? "dark" : "light";
  document.documentElement.classList.toggle("dark", mode === "dark");
  localStorage.setItem(THEME_KEY, mode);
  return mode;
};
