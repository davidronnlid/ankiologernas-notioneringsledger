import React from 'react';
import { Box, Tooltip } from '@material-ui/core';
import { getLectureStatus, getStatusColor, getStatusDisplayText } from '../utils/statusLoader';
import Lecture from '../types/lecture';

interface StatusIndicatorProps {
  lecture: Lecture;
  userName: string;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  lecture,
  userName,
  size = 'medium',
  showTooltip = true
}) => {
  const status = getLectureStatus(lecture, userName);
  
  if (!status) {
    return null;
  }

  const sizeConfig = {
    small: {
      padding: '2px 6px',
      fontSize: '0.65rem',
      borderRadius: '10px'
    },
    medium: {
      padding: '4px 8px',
      fontSize: '0.75rem',
      borderRadius: '12px'
    },
    large: {
      padding: '6px 12px',
      fontSize: '0.875rem',
      borderRadius: '16px'
    }
  };

  const config = sizeConfig[size];
  
  const statusBox = (
    <Box
      style={{
        backgroundColor: getStatusColor(status),
        color: 'white',
        padding: config.padding,
        borderRadius: config.borderRadius,
        fontSize: config.fontSize,
        fontWeight: 500,
        display: 'inline-block',
        lineHeight: 1,
      }}
    >
      {getStatusDisplayText(status)}
    </Box>
  );

  if (showTooltip) {
    return (
      <Tooltip title={`Status: ${getStatusDisplayText(status)}`} arrow>
        {statusBox}
      </Tooltip>
    );
  }

  return statusBox;
};

export default StatusIndicator;