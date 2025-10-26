// Theme utilities: validation, conversion, application

import { Theme, DEFAULT_THEME, FONT_FAMILY_MAP, FONT_SIZE_MAP } from "@/types/theme";

/**
 * Validates and normalizes a hex color
 * Accepts: "#fff", "fff", "#ffffff", "ffffff"
 * Returns: "#ffffff" or throws error
 */
export function validateHex(hex: string): string {
  // Remove # if present
  let clean = hex.trim().replace(/^#/, '');
  
  // Expand shorthand (e.g., "fff" -> "ffffff")
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  
  // Validate format
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  
  return `#${clean.toLowerCase()}`;
}

/**
 * Auto-corrects hex input (adds # if missing, expands shorthand)
 */
export function normalizeHex(input: string): string {
  try {
    return validateHex(input);
  } catch {
    // If invalid, return as-is (validation will catch it)
    return input;
  }
}

/**
 * Validates a complete theme object
 */
export function validateTheme(theme: Partial<Theme>): Theme {
  const validated: Theme = { ...DEFAULT_THEME };
  
  if (theme.primaryHex) {
    validated.primaryHex = validateHex(theme.primaryHex);
  }
  
  if (theme.accentHex) {
    validated.accentHex = validateHex(theme.accentHex);
  }
  
  if (theme.bgHex) {
    validated.bgHex = validateHex(theme.bgHex);
  }
  
  if (theme.textHex) {
    validated.textHex = validateHex(theme.textHex);
  }
  
  if (theme.mutedHex) {
    validated.mutedHex = validateHex(theme.mutedHex);
  }
  
  if (theme.fontFamily) {
    validated.fontFamily = theme.fontFamily;
  }
  
  if (theme.baseFontSize) {
    validated.baseFontSize = theme.baseFontSize;
  }
  
  if (theme.preset) {
    validated.preset = theme.preset;
  }
  
  return validated;
}

/**
 * Converts theme to CSS variables object
 */
export function themeToCSSVars(theme: Theme): Record<string, string> {
  return {
    '--theme-primary': theme.primaryHex,
    '--theme-accent': theme.accentHex || theme.primaryHex,
    '--theme-bg': theme.bgHex || '#ffffff',
    '--theme-text': theme.textHex || '#0F172A',
    '--theme-muted': theme.mutedHex || '#64748B',
    '--theme-font-family': FONT_FAMILY_MAP[theme.fontFamily],
    '--theme-font-size': FONT_SIZE_MAP[theme.baseFontSize]
  };
}

/**
 * Applies theme CSS variables to an element
 */
export function applyThemeToElement(element: HTMLElement, theme: Theme): void {
  const vars = themeToCSSVars(theme);
  Object.entries(vars).forEach(([key, value]) => {
    element.style.setProperty(key, value);
  });
}

/**
 * Applies theme to document root
 */
export function applyThemeToRoot(theme: Theme): void {
  applyThemeToElement(document.documentElement, theme);
}

/**
 * Checks if a color has sufficient contrast (WCAG AA minimum)
 * Returns true if contrast ratio is >= 4.5:1
 */
export function hasGoodContrast(foreground: string, background: string): boolean {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;
    
    const [rs, gs, bs] = [r, g, b].map(c => 
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  
  return ratio >= 4.5;
}

/**
 * Migrates legacy appearance config to new theme format
 */
export function migrateAppearanceToTheme(appearance: any): Theme {
  const theme: Theme = { ...DEFAULT_THEME };
  
  if (appearance?.colors) {
    theme.primaryHex = appearance.colors.accent || DEFAULT_THEME.primaryHex;
    theme.bgHex = appearance.colors.background || DEFAULT_THEME.bgHex;
    theme.textHex = appearance.colors.text || DEFAULT_THEME.textHex;
    theme.mutedHex = appearance.colors.muted || DEFAULT_THEME.mutedHex;
  }
  
  if (appearance?.typography?.font_family) {
    const fontMap: Record<string, any> = {
      'Inter': 'Inter',
      'Poppins': 'Poppins',
      'Montserrat': 'Montserrat',
      'System': 'System'
    };
    theme.fontFamily = fontMap[appearance.typography.font_family] || 'Inter';
  }
  
  // Map font size from px to size key
  if (appearance?.typography?.base_size) {
    const size = appearance.typography.base_size;
    if (size <= 14) theme.baseFontSize = 'sm';
    else if (size <= 16) theme.baseFontSize = 'md';
    else if (size <= 18) theme.baseFontSize = 'lg';
    else theme.baseFontSize = 'xl';
  }
  
  return validateTheme(theme);
}
