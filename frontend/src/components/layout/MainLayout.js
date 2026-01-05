import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
  Paper,
  IconButton,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  Divider,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Timeline as TimelineIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../../theme';

// Layout Constants - CSS Variables for easy adjustment
const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 60;
const MOBILE_BREAKPOINT = 960; // md breakpoint
const TRANSITION_DURATION = 300;

/**
 * MainLayout Component
 * 
 * Provides consistent sidebar + content layout across all pages.
 * Handles:
 * - Fixed sidebar on desktop (240px width)
 * - Collapsible sidebar on tablet
 * - Off-screen drawer on mobile
 * - Proper content margin to prevent overlap
 * - Smooth transitions
 */
export default function MainLayout({ children, title, actions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { colors, isDark } = useThemeContext();
  
  // Responsive breakpoints
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // State
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  
  // Get company from localStorage
  const company = localStorage.getItem('company');
  
  // Calculate current sidebar width
  const currentSidebarWidth = isMobile ? 0 : (collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH);
  
  // Navigation items
  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: <DashboardIcon /> 
    },
    { 
      path: '/monitoring', 
      label: 'Monitoring', 
      icon: <TimelineIcon /> 
    },
  ];
  
  // Handlers
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('company');
    navigate('/login');
  };
  
  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };
  
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };
  
  // Sidebar Content
  const sidebarContent = (
    <Box
      sx={{
        width: collapsed && !isMobile ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        height: '100%',
        background: colors.bgSidebar,
        borderRight: `1px solid rgba(255, 255, 255, 0.06)`,
        display: 'flex',
        flexDirection: 'column',
        transition: `width ${TRANSITION_DURATION}ms ease`,
        overflow: 'hidden',
      }}
    >
      {/* Logo Section */}
      <Box 
        sx={{ 
          p: collapsed ? 1.5 : 3, 
          borderBottom: `1px solid rgba(255, 255, 255, 0.06)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 72,
        }}
      >
        {!collapsed && (
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: '#f1f5f9',
                whiteSpace: 'nowrap',
              }}
            >
              Self Service Platform
            </Typography>
            <Typography variant="caption" sx={{ color: colors.textSidebarSecondary }}>
              Kubernetes
            </Typography>
          </Box>
        )}
        {!isMobile && (
          <IconButton 
            onClick={handleDrawerToggle}
            size="small"
            sx={{ 
              color: colors.textSidebarSecondary,
              transform: collapsed ? 'rotate(180deg)' : 'none',
              transition: `transform ${TRANSITION_DURATION}ms ease`,
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, py: 2, overflowY: 'auto', overflowX: 'hidden' }}>
        <List>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem
                key={item.path}
                button
                onClick={() => handleNavigation(item.path)}
                selected={isActive}
                sx={{
                  mx: collapsed ? 0.5 : 1,
                  px: collapsed ? 1.5 : 2,
                  borderRadius: 1,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(99, 102, 241, 0.15)',
                    '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
                  },
                  '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.08)' },
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    minWidth: collapsed ? 0 : 40,
                    color: isActive ? '#6366f1' : colors.textSidebarSecondary,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      color: isActive ? '#f1f5f9' : colors.textSidebarSecondary,
                      fontWeight: isActive ? 500 : 400,
                    }}
                  />
                )}
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* User Info Section */}
      <Box 
        sx={{ 
          p: collapsed ? 1 : 2, 
          borderTop: `1px solid rgba(255, 255, 255, 0.06)`,
          mt: 'auto',
        }}
      >
        {!collapsed && (
          <Box
            sx={{
              p: 1.5,
              mb: 1.5,
              bgcolor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 1,
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <Typography variant="body2" sx={{ color: colors.textSidebar, fontWeight: 500 }}>
              {company || 'Company'}
            </Typography>
            <Typography variant="caption" sx={{ color: colors.textSidebarSecondary }}>
              Active Workspace
            </Typography>
          </Box>
        )}
        <Button
          fullWidth={!collapsed}
          variant="outlined"
          startIcon={!collapsed ? <LogoutIcon /> : null}
          onClick={handleLogout}
          sx={{
            minWidth: collapsed ? 44 : 'auto',
            borderColor: alpha(colors.error, 0.3),
            color: colors.error,
            '&:hover': {
              borderColor: colors.error,
              bgcolor: alpha(colors.error, 0.1),
            },
          }}
        >
          {collapsed ? <LogoutIcon fontSize="small" /> : 'Logout'}
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        bgcolor: colors.bgDefault,
        overflow: 'hidden', // Prevent horizontal scrollbar
      }}
    >
      {/* Desktop Sidebar - Fixed position */}
      {!isMobile && (
        <Box
          component="nav"
          sx={{
            width: currentSidebarWidth,
            flexShrink: 0,
            transition: `width ${TRANSITION_DURATION}ms ease`,
          }}
        >
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              height: '100vh',
              width: currentSidebarWidth,
              zIndex: 1200,
              transition: `width ${TRANSITION_DURATION}ms ease`,
            }}
          >
            {sidebarContent}
          </Box>
        </Box>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              bgcolor: 'transparent',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            },
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Main Content Area - With proper margin */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',
          maxWidth: `calc(100vw - ${currentSidebarWidth}px)`,
          transition: `max-width ${TRANSITION_DURATION}ms ease`,
          overflow: 'hidden',
        }}
      >
        {/* Top AppBar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: colors.bgPaper,
            borderBottom: `1px solid rgba(255, 255, 255, 0.06)`,
            zIndex: 1100,
          }}
        >
          <Toolbar>
            {/* Mobile Menu Button */}
            {isMobile && (
              <IconButton
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, color: colors.textSecondary }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            {/* Page Title */}
            <Typography 
              variant="h6" 
              sx={{ 
                flex: 1, 
                color: colors.textPrimary, 
                fontWeight: 600,
              }}
            >
              {title}
            </Typography>
            
            {/* Action Buttons (passed from parent) */}
            {actions}
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: { xs: 2, sm: 3 },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

// Export constants for use in other components
export { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH, MOBILE_BREAKPOINT, TRANSITION_DURATION };
