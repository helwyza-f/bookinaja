export const spacing = {
  xs: 4,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  "2xl": 42,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const typography = {
  family: {
    sans: "System",
    display: "System",
    mono: "Courier",
  },
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 19,
    "2xl": 22,
    "3xl": 28,
  },
  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    black: "900" as const,
  },
} as const;

export const shadows = {
  soft: {
    shadowColor: "#020617",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  raised: {
    shadowColor: "#020617",
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;
