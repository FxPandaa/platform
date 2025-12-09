/**
 * Design System Theme Configuration
 * Self-Service Kubernetes Platform
 * 
 * Three Professional Themes: Light, Dark, Black (OLED)
 */
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme, alpha, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// ============================================
// CONSTANTS
// ============================================

export const POLLING_INTERVAL = 5000;
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};

export const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
};

// ============================================
// THEME KEYS
// ============================================

export const THEME_KEYS = {
  LIGHT: 'light',
  DARK: 'dark',
  BLACK: 'black',
};

export const THEME_LABELS = {
  [THEME_KEYS.LIGHT]: 'Light',
  [THEME_KEYS.DARK]: 'Dark',
  [THEME_KEYS.BLACK]: 'Black (OLED)',
};

export const THEME_ICONS = {
  [THEME_KEYS.LIGHT]: '☀️',
  [THEME_KEYS.DARK]: '🌙',
  [THEME_KEYS.BLACK]: '🖤',
};

// ============================================
// COLOR PALETTES PER THEME
// ============================================

const LIGHT_COLORS = {
  // Primary accents
  primary: '#5C4EDB',
  secondary: '#0095B6',
  
  // Status colors
  success: '#16A34A',
  warning: '#CA8A04',
  error: '#DC2626',
  info: '#0284C7',
  
  // Resource colors
  cpu: '#0891B2',
  memory: '#7C3AED',
  network: '#EA580C',
  cost: '#16A34A',
  
  // Background colors
  bgDefault: '#F5F7FA',
  bgPaper: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgHover: '#F1F5F9',
  bgSidebar: '#1E293B',
  
  // Text colors
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textDisabled: '#94A3B8',
  textSidebar: '#FFFFFF',
  textSidebarSecondary: 'rgba(255,255,255,0.7)',
  
  // Border colors
  border: '#E2E8F0',
  borderHover: '#CBD5E1',
  
  // EUSUITE
  eusuite: '#D97706',
  
  // Card specific
  cardGradient: 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 100%)',
  cardShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
  cardShadowHover: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
};

const DARK_COLORS = {
  // Primary accents
  primary: '#8B7DFF',
  secondary: '#00D9FF',
  
  // Status colors
  success: '#00E676',
  warning: '#FFC107',
  error: '#FF5252',
  info: '#2196F3',
  
  // Resource colors
  cpu: '#00BCD4',
  memory: '#9C27B0',
  network: '#FF9800',
  cost: '#4CAF50',
  
  // Background colors
  bgDefault: '#0A0E27',
  bgPaper: '#141B3D',
  bgElevated: '#1A2347',
  bgHover: '#1E2952',
  bgSidebar: '#080B1C',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textDisabled: 'rgba(255,255,255,0.4)',
  textSidebar: '#FFFFFF',
  textSidebarSecondary: 'rgba(255,255,255,0.7)',
  
  // Border colors
  border: 'rgba(255,255,255,0.1)',
  borderHover: 'rgba(255,255,255,0.2)',
  
  // EUSUITE
  eusuite: '#F59E0B',
  
  // Card specific
  cardGradient: 'linear-gradient(145deg, #141B3D 0%, #0D1229 100%)',
  cardShadow: '0 4px 6px rgba(0,0,0,0.3)',
  cardShadowHover: '0 8px 25px rgba(139, 125, 255, 0.15)',
};

const BLACK_COLORS = {
  // Primary accents (neon style for contrast)
  primary: '#A78BFA',
  secondary: '#22D3EE',
  
  // Status colors (vibrant for contrast on black)
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  
  // Resource colors
  cpu: '#22D3EE',
  memory: '#C084FC',
  network: '#FB923C',
  cost: '#4ADE80',
  
  // Background colors - TRUE BLACK
  bgDefault: '#000000',
  bgPaper: '#0A0A0A',
  bgElevated: '#121212',
  bgHover: '#1A1A1A',
  bgSidebar: '#000000',
  
  // Text colors
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textDisabled: '#52525B',
  textSidebar: '#FAFAFA',
  textSidebarSecondary: '#A1A1AA',
  
  // Border colors
  border: '#27272A',
  borderHover: '#3F3F46',
  
  // EUSUITE
  eusuite: '#F59E0B',
  
  // Card specific
  cardGradient: 'linear-gradient(145deg, #0A0A0A 0%, #000000 100%)',
  cardShadow: '0 0 0 1px #27272A',
  cardShadowHover: '0 0 20px rgba(167, 139, 250, 0.2)',
};

export const THEME_COLORS = {
  [THEME_KEYS.LIGHT]: LIGHT_COLORS,
  [THEME_KEYS.DARK]: DARK_COLORS,
  [THEME_KEYS.BLACK]: BLACK_COLORS,
};

// Default export for backward compatibility
export const COLORS = DARK_COLORS;

// ============================================
// STATUS & CATEGORY COLORS (Theme-aware)
// ============================================

export const getStatusColors = (themeKey = THEME_KEYS.DARK) => {
  const colors = THEME_COLORS[themeKey];
  return {
    Running: colors.success,
    Pending: colors.warning,
    Failed: colors.error,
    Succeeded: colors.info,
    CrashLoopBackOff: colors.error,
    Error: colors.error,
    Unknown: '#64748B',
  };
};

export const getCategoryColors = (themeKey = THEME_KEYS.DARK) => {
  const colors = THEME_COLORS[themeKey];
  return {
    app: colors.primary,
    db: colors.memory,
    cache: colors.cpu,
    monitoring: '#EC4899',
    eusuite: colors.eusuite,
    other: '#64748B',
  };
};

// Backward compatibility exports
export const STATUS_COLORS = getStatusColors(THEME_KEYS.DARK);
export const CATEGORY_COLORS = getCategoryColors(THEME_KEYS.DARK);

// ============================================
// CREATE MUI THEME FUNCTION
// ============================================

const createAppTheme = (themeKey) => {
  const colors = THEME_COLORS[themeKey];
  const isDark = themeKey !== THEME_KEYS.LIGHT;
  
  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: { 
        main: colors.primary,
        light: alpha(colors.primary, 0.8),
        dark: alpha(colors.primary, 1.2),
        contrastText: '#FFFFFF',
      },
      secondary: { 
        main: colors.secondary,
        contrastText: '#FFFFFF',
      },
      success: { 
        main: colors.success,
      },
      warning: { 
        main: colors.warning,
      },
      error: { 
        main: colors.error,
      },
      info: {
        main: colors.info,
      },
      background: {
        default: colors.bgDefault,
        paper: colors.bgPaper,
      },
      text: {
        primary: colors.textPrimary,
        secondary: colors.textSecondary,
        disabled: colors.textDisabled,
      },
      divider: colors.border,
    },
    
    shape: { 
      borderRadius: 12,
    },
    
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { 
        textTransform: 'none',
        fontWeight: 500,
      },
    },
    
    // Custom theme properties
    custom: {
      colors,
      sidebar: {
        width: 240,
        collapsedWidth: 60,
        background: colors.bgSidebar,
        text: colors.textSidebar,
        textSecondary: colors.textSidebarSecondary,
      },
      card: {
        gradient: colors.cardGradient,
        shadow: colors.cardShadow,
        shadowHover: colors.cardShadowHover,
      },
      statusColors: getStatusColors(themeKey),
      categoryColors: getCategoryColors(themeKey),
    },
    
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: `${colors.border} transparent`,
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              width: 8,
              height: 8,
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: 4,
              backgroundColor: colors.border,
              '&:hover': {
                backgroundColor: colors.borderHover,
              },
            },
            '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            background: colors.cardGradient,
            border: `1px solid ${colors.border}`,
            boxShadow: colors.cardShadow,
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: colors.borderHover,
              boxShadow: colors.cardShadowHover,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: colors.bgPaper,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 16px',
            fontWeight: 500,
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: `0 4px 12px ${alpha(colors.primary, 0.3)}`,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: colors.bgPaper,
            border: `1px solid ${colors.border}`,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: colors.bgElevated,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            color: colors.textPrimary,
            fontSize: '0.75rem',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.bgSidebar,
            borderRight: `1px solid ${colors.border}`,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: '2px 8px',
            '&:hover': {
              backgroundColor: alpha(colors.primary, 0.1),
            },
            '&.Mui-selected': {
              backgroundColor: alpha(colors.primary, 0.15),
              '&:hover': {
                backgroundColor: alpha(colors.primary, 0.2),
              },
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: colors.border,
              },
              '&:hover fieldset': {
                borderColor: colors.borderHover,
              },
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.border,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.borderHover,
            },
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.bgElevated,
            border: `1px solid ${colors.border}`,
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: colors.border,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            backgroundColor: alpha(colors.border, 0.5),
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
          standardSuccess: {
            backgroundColor: alpha(colors.success, 0.1),
            color: colors.success,
          },
          standardError: {
            backgroundColor: alpha(colors.error, 0.1),
            color: colors.error,
          },
          standardWarning: {
            backgroundColor: alpha(colors.warning, 0.1),
            color: colors.warning,
          },
          standardInfo: {
            backgroundColor: alpha(colors.info, 0.1),
            color: colors.info,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: colors.border,
          },
          head: {
            backgroundColor: colors.bgElevated,
            fontWeight: 600,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: colors.bgHover,
            },
          },
        },
      },
    },
  });
};

// ============================================
// THEME CONTEXT
// ============================================

const ThemeContext = createContext({
  themeKey: THEME_KEYS.DARK,
  setThemeKey: () => {},
  colors: DARK_COLORS,
  statusColors: STATUS_COLORS,
  categoryColors: CATEGORY_COLORS,
});

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

// ============================================
// THEME PROVIDER COMPONENT
// ============================================

const THEME_STORAGE_KEY = 'shield-saas-theme';

export const ThemeProvider = ({ children }) => {
  const [themeKey, setThemeKeyState] = useState(() => {
    // Load saved theme from localStorage
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && Object.values(THEME_KEYS).includes(saved)) {
      return saved;
    }
    // Default to dark theme
    return THEME_KEYS.DARK;
  });
  
  const setThemeKey = (newTheme) => {
    if (Object.values(THEME_KEYS).includes(newTheme)) {
      setThemeKeyState(newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }
  };
  
  // Create the MUI theme based on current themeKey
  const muiTheme = useMemo(() => createAppTheme(themeKey), [themeKey]);
  
  // Context value
  const contextValue = useMemo(() => ({
    themeKey,
    setThemeKey,
    colors: THEME_COLORS[themeKey],
    statusColors: getStatusColors(themeKey),
    categoryColors: getCategoryColors(themeKey),
    isDark: themeKey !== THEME_KEYS.LIGHT,
    isBlack: themeKey === THEME_KEYS.BLACK,
  }), [themeKey]);
  
  // Update CSS custom properties for theme
  useEffect(() => {
    const colors = THEME_COLORS[themeKey];
    const root = document.documentElement;
    
    root.style.setProperty('--sidebar-bg', colors.bgSidebar);
    root.style.setProperty('--sidebar-text', colors.textSidebar);
    root.style.setProperty('--bg-default', colors.bgDefault);
    root.style.setProperty('--bg-paper', colors.bgPaper);
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--border-color', colors.border);
    root.style.setProperty('--primary-color', colors.primary);
    root.style.setProperty('--secondary-color', colors.secondary);
  }, [themeKey]);
  
  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// ============================================
// DEFAULT EXPORT (backward compatibility)
// ============================================

// Export default dark theme for backward compatibility
const theme = createAppTheme(THEME_KEYS.DARK);
export default theme;
