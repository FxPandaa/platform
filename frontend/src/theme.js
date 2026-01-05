/**
 * Design System Theme Configuration
 * Self-Service Kubernetes Platform
 * 
 * Single clean dark theme - matching login screen style
 */
import React, { createContext, useContext, useMemo } from 'react';
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
// SINGLE DARK THEME COLORS (matching login screen)
// ============================================

const COLORS = {
  // Primary accents
  primary: '#6366f1',
  secondary: '#8b5cf6',
  
  // Status colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Resource colors
  cpu: '#06b6d4',
  memory: '#8b5cf6',
  network: '#f97316',
  cost: '#22c55e',
  
  // Background colors (matching login: #0f172a, #1e293b)
  bgDefault: '#0f172a',
  bgPaper: '#1e293b',
  bgElevated: '#334155',
  bgHover: '#334155',
  bgSidebar: '#0f172a',
  
  // Text colors
  textPrimary: '#f1f5f9',
  textSecondary: '#64748b',
  textDisabled: '#475569',
  textSidebar: '#f1f5f9',
  textSidebarSecondary: '#64748b',
  
  // Border colors (matching login: rgba(255, 255, 255, 0.06))
  border: 'rgba(255, 255, 255, 0.06)',
  borderHover: 'rgba(255, 255, 255, 0.12)',
  
  // Card specific - clean, no gradients
  cardBg: '#1e293b',
  cardShadow: 'none',
  cardShadowHover: 'none',
};

export { COLORS };

// ============================================
// STATUS & CATEGORY COLORS
// ============================================

export const STATUS_COLORS = {
  Running: COLORS.success,
  Pending: COLORS.warning,
  Failed: COLORS.error,
  Succeeded: COLORS.info,
  CrashLoopBackOff: COLORS.error,
  Error: COLORS.error,
  Unknown: '#64748b',
};

export const CATEGORY_COLORS = {
  app: COLORS.primary,
  db: COLORS.memory,
  cache: COLORS.cpu,
  monitoring: '#ec4899',
  eusuite: COLORS.warning,
  other: '#64748b',
};

// Backward compatibility
export const getStatusColors = () => STATUS_COLORS;
export const getCategoryColors = () => CATEGORY_COLORS;

// ============================================
// CREATE MUI THEME
// ============================================

const createAppTheme = () => {
  return createTheme({
    palette: {
      mode: 'dark',
      primary: { 
        main: COLORS.primary,
        light: alpha(COLORS.primary, 0.8),
        dark: alpha(COLORS.primary, 1.2),
        contrastText: '#FFFFFF',
      },
      secondary: { 
        main: COLORS.secondary,
        contrastText: '#FFFFFF',
      },
      success: { 
        main: COLORS.success,
      },
      warning: { 
        main: COLORS.warning,
      },
      error: { 
        main: COLORS.error,
      },
      info: {
        main: COLORS.info,
      },
      background: {
        default: COLORS.bgDefault,
        paper: COLORS.bgPaper,
      },
      text: {
        primary: COLORS.textPrimary,
        secondary: COLORS.textSecondary,
        disabled: COLORS.textDisabled,
      },
      divider: COLORS.border,
    },
    
    // CLEAN styling - less rounded corners (matching login: borderRadius: 2 = 8px)
    shape: { 
      borderRadius: 8,
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
      colors: COLORS,
      sidebar: {
        width: 240,
        collapsedWidth: 60,
        background: COLORS.bgSidebar,
        text: COLORS.textSidebar,
        textSecondary: COLORS.textSidebarSecondary,
      },
      card: {
        background: COLORS.cardBg,
        shadow: COLORS.cardShadow,
        shadowHover: COLORS.cardShadowHover,
      },
      statusColors: STATUS_COLORS,
      categoryColors: CATEGORY_COLORS,
    },
    
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: `${COLORS.border} transparent`,
            '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
              width: 8,
              height: 8,
            },
            '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
              borderRadius: 4,
              backgroundColor: COLORS.border,
              '&:hover': {
                backgroundColor: COLORS.borderHover,
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
            backgroundColor: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
            boxShadow: 'none',
            borderRadius: 8,
            transition: 'border-color 0.2s ease',
            '&:hover': {
              borderColor: COLORS.borderHover,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: COLORS.bgPaper,
            borderRadius: 8,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            padding: '8px 16px',
            fontWeight: 500,
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            borderRadius: 6,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: COLORS.bgPaper,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: COLORS.bgElevated,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            color: COLORS.textPrimary,
            fontSize: '0.75rem',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: COLORS.bgSidebar,
            borderRight: `1px solid ${COLORS.border}`,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            margin: '2px 8px',
            '&:hover': {
              backgroundColor: alpha(COLORS.primary, 0.1),
            },
            '&.Mui-selected': {
              backgroundColor: alpha(COLORS.primary, 0.15),
              '&:hover': {
                backgroundColor: alpha(COLORS.primary, 0.2),
              },
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 6,
              '& fieldset': {
                borderColor: COLORS.border,
              },
              '&:hover fieldset': {
                borderColor: COLORS.borderHover,
              },
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: COLORS.border,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: COLORS.borderHover,
            },
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: COLORS.bgPaper,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: COLORS.border,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            backgroundColor: alpha(COLORS.border, 0.5),
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 6,
          },
          standardSuccess: {
            backgroundColor: alpha(COLORS.success, 0.1),
            color: COLORS.success,
            border: `1px solid ${alpha(COLORS.success, 0.2)}`,
          },
          standardError: {
            backgroundColor: alpha(COLORS.error, 0.1),
            color: COLORS.error,
            border: `1px solid ${alpha(COLORS.error, 0.2)}`,
          },
          standardWarning: {
            backgroundColor: alpha(COLORS.warning, 0.1),
            color: COLORS.warning,
            border: `1px solid ${alpha(COLORS.warning, 0.2)}`,
          },
          standardInfo: {
            backgroundColor: alpha(COLORS.info, 0.1),
            color: COLORS.info,
            border: `1px solid ${alpha(COLORS.info, 0.2)}`,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: COLORS.border,
          },
          head: {
            backgroundColor: COLORS.bgPaper,
            fontWeight: 600,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: alpha(COLORS.primary, 0.04),
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 40,
          },
          indicator: {
            height: 2,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 40,
            textTransform: 'none',
            fontWeight: 500,
          },
        },
      },
    },
  });
};

// ============================================
// THEME CONTEXT (simplified - single theme)
// ============================================

const ThemeContext = createContext({
  colors: COLORS,
  statusColors: STATUS_COLORS,
  categoryColors: CATEGORY_COLORS,
  isDark: true,
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

export const ThemeProvider = ({ children }) => {
  const muiTheme = useMemo(() => createAppTheme(), []);
  
  const contextValue = useMemo(() => ({
    colors: COLORS,
    statusColors: STATUS_COLORS,
    categoryColors: CATEGORY_COLORS,
    isDark: true,
  }), []);
  
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
// DEFAULT EXPORT
// ============================================

const theme = createAppTheme();
export default theme;
