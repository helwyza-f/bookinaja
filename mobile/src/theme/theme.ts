import { darkColors, lightColors } from "./colors";
import { createComponentTheme } from "./components";
import { radius, shadows, spacing, typography } from "./tokens";
import type { AppTheme, ThemeCore, ThemeMode } from "./types";
export type { AppTheme, ThemeCore, ThemeMode } from "./types";

function createTheme(mode: ThemeMode): ThemeCore {
  const colors = mode === "dark" ? darkColors : lightColors;
  return {
    mode,
    colors,
    spacing,
    radius,
    typography,
    shadows,
  };
}

const lightBase = createTheme("light");
const darkBase = createTheme("dark");

export const lightTheme: AppTheme = {
  ...lightBase,
  components: createComponentTheme(lightBase),
};

export const darkTheme: AppTheme = {
  ...darkBase,
  components: createComponentTheme(darkBase),
};
