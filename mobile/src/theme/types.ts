import { darkColors, lightColors } from "./colors";
import { radius, shadows, spacing, typography } from "./tokens";

export type ThemeMode = "light" | "dark";
export type ThemeColors = typeof lightColors | typeof darkColors;

export type ThemeCore = {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
};

export type ComponentTheme = {
  screen: {
    flex: number;
    backgroundColor: string;
  };
  container: {
    paddingHorizontal: number;
    paddingVertical: number;
  };
  card: {
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    borderRadius: number;
    padding: number;
  };
  buttonPrimary: {
    minHeight: number;
    borderRadius: number;
    paddingHorizontal: number;
    alignItems: "center";
    justifyContent: "center";
    backgroundColor: string;
  };
  buttonSecondary: {
    minHeight: number;
    borderRadius: number;
    paddingHorizontal: number;
    alignItems: "center";
    justifyContent: "center";
    backgroundColor: string;
    borderWidth: number;
    borderColor: string;
  };
  buttonTextPrimary: {
    color: string;
    fontSize: number;
    fontWeight: "600";
  };
  buttonTextSecondary: {
    color: string;
    fontSize: number;
    fontWeight: "600";
  };
  input: {
    minHeight: number;
    borderRadius: number;
    paddingHorizontal: number;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    color: string;
  };
  label: {
    color: string;
    fontSize: number;
    fontWeight: "500";
  };
};

export type AppTheme = ThemeCore & {
  components: ComponentTheme;
};
