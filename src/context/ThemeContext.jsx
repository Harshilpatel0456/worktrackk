import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const FONT_SIZES = {
  small: '15px',
  standard: '16px',
  large: '18px',
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('worktrack_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [fontSize, setFontSizeState] = useState(() => {
    try {
      const saved = localStorage.getItem('worktrack_font_size');
      if (saved && FONT_SIZES[saved]) return saved;
      return 'standard';
    } catch {
      return 'standard';
    }
  });

  // Apply theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
    try {
      localStorage.setItem('worktrack_theme', theme);
    } catch {}
  }, [theme]);

  // Apply root font-size scaling
  useEffect(() => {
    const root = document.documentElement;
    const pxSize = FONT_SIZES[fontSize] || '16px';
    root.style.fontSize = pxSize;
    root.setAttribute('data-font-size', fontSize);
    try {
      localStorage.setItem('worktrack_font_size', fontSize);
    } catch {}
  }, [fontSize]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setFontSize = (size) => {
    if (FONT_SIZES[size]) {
      setFontSizeState(size);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        toggleTheme,
        fontSize,
        setFontSize,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
