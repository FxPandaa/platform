/**
 * Design System Theme Configuration
 * Self-Service Kubernetes Platform
 */
import { createTheme, alpha } from '@mui/material/styles';

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
// COLOR PALETTE
// ============================================

export const COLORS = {
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
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textDisabled: 'rgba(255,255,255,0.4)',
  
  // Border colors
  border: 'rgba(255,255,255,0.1)',
  borderHover: 'rgba(255,255,255,0.2)',
  
  // EUSUITE
  eusuite: '#F59E0B',
};

export const STATUS_COLORS = {
  Running: COLORS.success,
  Pending: COLORS.warning,
  Failed: COLORS.error,
  Succeeded: COLORS.info,
  CrashLoopBackOff: COLORS.error,
  Error: COLORS.error,
  Unknown: '#64748B',
};

export const CATEGORY_COLORS = {
  app: COLORS.primary,
  db: COLORS.memory,
  cache: COLORS.cpu,
  monitoring: '#EC4899',
  eusuite: COLORS.eusuite,
  other: '#64748B',
};

// ============================================
// MUI THEME
// ============================================

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { 
      main: COLORS.primary,
      light: alpha(COLORS.primary, 0.8),
      dark: alpha(COLORS.primary, 1.2),
    },
    secondary: { 
      main: COLORS.secondary,
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
  
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${COLORS.border}`,
          transition: 'all 0.3s ease',
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
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
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
          backgroundColor: COLORS.bgPaper,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: COLORS.bgElevated,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
