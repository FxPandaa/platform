/**
 * ResourceBar Component
 * Displays a progress bar for CPU/Memory usage
 */
import React from 'react';
import { Box, Typography, LinearProgress, Tooltip } from '@mui/material';
import { COLORS } from '../../theme';

/**
 * Resource usage bar with label and percentage
 */
export function ResourceBar({ 
  label, 
  value = 0, 
  max = 100, 
  unit = '', 
  color = 'primary',
  showLabel = true,
  size = 'normal' 
}) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  
  const getColor = () => {
    if (typeof color === 'string' && color.startsWith('#')) return color;
    if (percentage > 90) return COLORS.error;
    if (percentage > 70) return COLORS.warning;
    return color === 'cpu' ? COLORS.cpu : 
           color === 'memory' ? COLORS.memory : 
           COLORS.primary;
  };

  const barColor = getColor();
  const height = size === 'small' ? 4 : size === 'large' ? 10 : 6;

  return (
    <Box sx={{ width: '100%', mb: size === 'small' ? 0.5 : 1 }}>
      {showLabel && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ fontWeight: 500, fontSize: size === 'small' ? '0.65rem' : '0.75rem' }}
          >
            {label}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.primary"
            sx={{ fontWeight: 600, fontSize: size === 'small' ? '0.65rem' : '0.75rem' }}
          >
            {value}{unit} / {max}{unit}
          </Typography>
        </Box>
      )}
      <Tooltip title={`${percentage.toFixed(1)}%`} arrow placement="top">
        <LinearProgress
          variant="determinate"
          value={percentage}
          sx={{
            height,
            borderRadius: height / 2,
            bgcolor: 'rgba(255,255,255,0.1)',
            '& .MuiLinearProgress-bar': {
              bgcolor: barColor,
              borderRadius: height / 2,
              transition: 'transform 0.5s ease',
            },
          }}
        />
      </Tooltip>
    </Box>
  );
}

/**
 * Circular resource indicator
 */
export function ResourceCircle({ value = 0, max = 100, size = 60, color = 'primary', label }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const circumference = 2 * Math.PI * ((size - 8) / 2);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage > 90) return COLORS.error;
    if (percentage > 70) return COLORS.warning;
    return color === 'cpu' ? COLORS.cpu : 
           color === 'memory' ? COLORS.memory : 
           COLORS.primary;
  };

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 8) / 2}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 8) / 2}
          fill="none"
          stroke={getColor()}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="caption" fontWeight="bold" fontSize="0.7rem">
          {percentage.toFixed(0)}%
        </Typography>
        {label && (
          <Typography variant="caption" color="text.secondary" fontSize="0.55rem">
            {label}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default ResourceBar;
