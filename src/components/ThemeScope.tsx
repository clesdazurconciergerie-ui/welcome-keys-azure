import { useEffect, useRef } from 'react';
import { Theme } from '@/types/theme';
import { applyThemeToElement } from '@/lib/theme-utils';

interface ThemeScopeProps {
  theme: Theme;
  children: React.ReactNode;
  className?: string;
}

/**
 * ThemeScope component applies theme CSS variables to its container
 * Use this to scope theme application to specific parts of the page
 */
export default function ThemeScope({ theme, children, className = '' }: ThemeScopeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      applyThemeToElement(containerRef.current, theme);
    }
  }, [theme]);

  return (
    <div 
      ref={containerRef}
      className={`theme-scope ${className}`}
      style={{
        color: 'var(--theme-text)',
        backgroundColor: 'var(--theme-bg)',
        fontFamily: 'var(--theme-font-family)',
        fontSize: 'var(--theme-font-size)'
      }}
    >
      {children}
    </div>
  );
}
