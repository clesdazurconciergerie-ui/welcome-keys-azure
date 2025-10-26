// Database operations for theme persistence

import { supabase } from "@/integrations/supabase/client";
import { Theme, DEFAULT_THEME } from "@/types/theme";
import { validateTheme, migrateAppearanceToTheme } from "./theme-utils";

/**
 * Saves theme to database for a booklet
 */
export async function saveThemeToDatabase(bookletId: string, theme: Theme): Promise<void> {
  const validated = validateTheme(theme);
  
  // Convert theme to appearance format for DB compatibility
  const appearance = {
    theme: validated.preset || 'custom',
    colors: {
      background: validated.bgHex || '#ffffff',
      surface: validated.bgHex || '#ffffff',
      accent: validated.primaryHex,
      text: validated.textHex || '#0F172A',
      muted: validated.mutedHex || '#64748B'
    },
    typography: {
      font_family: validated.fontFamily,
      base_size: parseInt(validated.baseFontSize === 'sm' ? '14' : validated.baseFontSize === 'lg' ? '18' : validated.baseFontSize === 'xl' ? '20' : '16'),
      heading_weight: 700,
      body_weight: 400
    },
    // Store the full theme object for future use
    _theme_v2: {
      primaryHex: validated.primaryHex,
      accentHex: validated.accentHex,
      bgHex: validated.bgHex,
      textHex: validated.textHex,
      mutedHex: validated.mutedHex,
      fontFamily: validated.fontFamily,
      baseFontSize: validated.baseFontSize,
      preset: validated.preset
    }
  };

  const { error } = await supabase
    .from('booklets')
    .update({ appearance: appearance as any })
    .eq('id', bookletId);

  if (error) {
    console.error('Error saving theme:', error);
    throw error;
  }
}

/**
 * Loads theme from database for a booklet
 */
export async function loadThemeFromDatabase(bookletId: string): Promise<Theme> {
  const { data, error } = await supabase
    .from('booklets')
    .select('appearance')
    .eq('id', bookletId)
    .single();

  if (error) {
    console.error('Error loading theme:', error);
    return DEFAULT_THEME;
  }

  if (!data?.appearance) {
    return DEFAULT_THEME;
  }

  const appearance = data.appearance as any;

  // Check if new theme format exists
  if (appearance._theme_v2) {
    return validateTheme(appearance._theme_v2);
  }

  // Migrate from old appearance format
  return migrateAppearanceToTheme(appearance);
}

/**
 * Loads theme from public booklet data
 */
export function extractThemeFromBooklet(booklet: any): Theme {
  if (booklet?.appearance?._theme_v2) {
    return validateTheme(booklet.appearance._theme_v2);
  }

  if (booklet?.appearance) {
    return migrateAppearanceToTheme(booklet.appearance);
  }

  // Fallback to legacy fields
  return {
    primaryHex: booklet?.accent_color || booklet?.background_color || DEFAULT_THEME.primaryHex,
    bgHex: booklet?.background_color || DEFAULT_THEME.bgHex,
    textHex: booklet?.text_color || DEFAULT_THEME.textHex,
    mutedHex: DEFAULT_THEME.mutedHex,
    fontFamily: DEFAULT_THEME.fontFamily,
    baseFontSize: DEFAULT_THEME.baseFontSize
  };
}
