/**
 * StatusBadge Component
 * Displays a status indicator with color and optional animation
 */
import React from 'react';
import { Chip, Box } from '@mui/material';
import { STATUS_COLORS } from '../../theme';

/**
 * Status badge with glow effect
 */
export function StatusBadge({ status, size = 'small', showGlow = true }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.Unknown;
  const isRunning = status === 'Running';
  
  return (
    <Chip
      label={status}
      size={size}
      sx={{
        bgcolor: color,
        color: '#fff',
        fontWeight: 600,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        boxShadow: showGlow ? `0 0 12px ${color}40` : 'none',
        animation: isRunning ? 'none' : 'pulse 2s infinite',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
      }}
    />
  );
}

/**
 * Status dot indicator
 */
export function StatusDot({ status, size = 12 }) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.Unknown;
  const isRunning = status === 'Running';
  
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: color,
        boxShadow: `0 0 8px ${color}`,
        animation: isRunning ? 'none' : 'blink 1.5s infinite',
        '@keyframes blink': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
      }}
    />
  );
}

export default StatusBadge;
