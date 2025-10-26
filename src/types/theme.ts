// Unified theme system types and constants

export type FontFamily = "Inter" | "Poppins" | "Montserrat" | "System";
export type FontSize = "sm" | "md" | "lg" | "xl";
export type ThemePreset = "luxe_marine" | "minimal_blanc" | "noir_elegant" | "custom";

export interface Theme {
  primaryHex: string;      // Main brand color (e.g., "#071552")
  accentHex?: string;      // Optional accent color
  bgHex?: string;          // Background color
  textHex?: string;        // Text color
  mutedHex?: string;       // Secondary text color
  fontFamily: FontFamily;
  baseFontSize: FontSize;
  preset?: ThemePreset;
}

// Default theme values
export const DEFAULT_THEME: Theme = {
  primaryHex: "#071552",
  accentHex: "#18c0df",
  bgHex: "#ffffff",
  textHex: "#0F172A",
  mutedHex: "#64748B",
  fontFamily: "Inter",
  baseFontSize: "md",
  preset: "luxe_marine"
};

// Theme presets
export const THEME_PRESETS: Record<ThemePreset, Omit<Theme, 'preset'>> = {
  luxe_marine: {
    primaryHex: "#071552",
    accentHex: "#18c0df",
    bgHex: "#ffffff",
    textHex: "#0F172A",
    mutedHex: "#64748B",
    fontFamily: "Inter",
    baseFontSize: "md"
  },
  minimal_blanc: {
    primaryHex: "#000000",
    accentHex: "#666666",
    bgHex: "#ffffff",
    textHex: "#1a1a1a",
    mutedHex: "#737373",
    fontFamily: "System",
    baseFontSize: "md"
  },
  noir_elegant: {
    primaryHex: "#1a1a1a",
    accentHex: "#d4af37",
    bgHex: "#0a0a0a",
    textHex: "#ffffff",
    mutedHex: "#a3a3a3",
    fontFamily: "Poppins",
    baseFontSize: "md"
  },
  custom: {
    primaryHex: "#071552",
    accentHex: "#18c0df",
    bgHex: "#ffffff",
    textHex: "#0F172A",
    mutedHex: "#64748B",
    fontFamily: "Inter",
    baseFontSize: "md"
  }
};

// Font family mapping for CSS
export const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  Inter: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  Poppins: "'Poppins', ui-sans-serif, system-ui, -apple-system, sans-serif",
  Montserrat: "'Montserrat', ui-sans-serif, system-ui, -apple-system, sans-serif",
  System: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
};

// Font size mapping (rem values)
export const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: "14px",
  md: "16px",
  lg: "18px",
  xl: "20px"
};

// Tailwind safe classes for fonts (must exist in safelist)
export const FONT_SIZE_CLASSES: Record<FontSize, string> = {
  sm: "text-[14px]",
  md: "text-[16px]",
  lg: "text-[18px]",
  xl: "text-[20px]"
};

export const FONT_FAMILY_CLASSES: Record<FontFamily, string> = {
  Inter: "font-inter",
  Poppins: "font-poppins",
  Montserrat: "font-montserrat",
  System: "font-sans"
};
