/**
 * ThemeSelector Component
 * 
 * A compact theme switcher for the sidebar with support for
 * Light, Dark, and Black (OLED) themes.
 */
import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  LightMode as LightIcon,
  DarkMode as DarkIcon,
  Brightness4 as BlackIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useThemeContext, THEME_KEYS, THEME_LABELS } from '../../theme';

// Theme option configurations
const THEME_OPTIONS = [
  {
    key: THEME_KEYS.LIGHT,
    label: THEME_LABELS[THEME_KEYS.LIGHT],
    icon: LightIcon,
    description: 'Clean and bright',
    colors: { bg: '#F5F7FA', accent: '#5C4EDB' },
  },
  {
    key: THEME_KEYS.DARK,
    label: THEME_LABELS[THEME_KEYS.DARK],
    icon: DarkIcon,
    description: 'Easy on the eyes',
    colors: { bg: '#0A0E27', accent: '#8B7DFF' },
  },
  {
    key: THEME_KEYS.BLACK,
    label: THEME_LABELS[THEME_KEYS.BLACK],
    icon: BlackIcon,
    description: 'OLED-friendly',
    colors: { bg: '#000000', accent: '#A78BFA' },
  },
];

// Icon-only version for collapsed sidebar
export const ThemeSelectorCompact = () => {
  const { themeKey, setThemeKey } = useThemeContext();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleThemeSelect = (key) => {
    setThemeKey(key);
    handleClose();
  };
  
  const currentOption = THEME_OPTIONS.find(opt => opt.key === themeKey);
  const CurrentIcon = currentOption?.icon || PaletteIcon;
  
  return (
    <>
      <Tooltip title="Change Theme" placement="right">
        <IconButton
          onClick={handleClick}
          sx={{
            color: 'inherit',
            '&:hover': {
              backgroundColor: alpha('#FFFFFF', 0.1),
            },
          }}
        >
          <CurrentIcon />
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            minWidth: 200,
            ml: 1,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Choose Theme
          </Typography>
        </Box>
        
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = themeKey === option.key;
          
          return (
            <MenuItem
              key={option.key}
              onClick={() => handleThemeSelect(option.key)}
              selected={isSelected}
              sx={{
                py: 1.5,
                '&.Mui-selected': {
                  backgroundColor: alpha(option.colors.accent, 0.1),
                },
              }}
            >
              <ListItemIcon>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: option.colors.bg,
                    border: `2px solid ${option.colors.accent}`,
                  }}
                >
                  <Icon 
                    fontSize="small" 
                    sx={{ color: option.colors.accent }}
                  />
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={option.label}
                secondary={option.description}
                primaryTypographyProps={{ fontWeight: isSelected ? 600 : 400 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              {isSelected && (
                <CheckIcon 
                  fontSize="small" 
                  sx={{ color: 'primary.main', ml: 1 }} 
                />
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

// Full version for expanded sidebar
export const ThemeSelectorFull = () => {
  const { themeKey, setThemeKey, colors } = useThemeContext();
  
  const handleCycleTheme = () => {
    const keys = Object.values(THEME_KEYS);
    const currentIndex = keys.indexOf(themeKey);
    const nextIndex = (currentIndex + 1) % keys.length;
    setThemeKey(keys[nextIndex]);
  };
  
  const currentOption = THEME_OPTIONS.find(opt => opt.key === themeKey);
  const CurrentIcon = currentOption?.icon || PaletteIcon;
  
  return (
    <Box
      onClick={handleCycleTheme}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1,
        mx: 1,
        borderRadius: 1,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: alpha('#FFFFFF', 0.1),
        },
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: currentOption?.colors.bg,
          border: `2px solid ${currentOption?.colors.accent}`,
        }}
      >
        <CurrentIcon 
          fontSize="small" 
          sx={{ color: currentOption?.colors.accent }}
        />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 500,
            color: colors.textSidebar,
          }}
        >
          {currentOption?.label}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            color: colors.textSidebarSecondary,
          }}
        >
          Click to change
        </Typography>
      </Box>
    </Box>
  );
};

// Default export - adaptive version based on sidebar state
const ThemeSelector = ({ collapsed = false }) => {
  return collapsed ? <ThemeSelectorCompact /> : <ThemeSelectorFull />;
};

export default ThemeSelector;
