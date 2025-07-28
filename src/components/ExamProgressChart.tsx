import React, { useState } from 'react';
import { 
  Typography, 
  Paper,
  Chip,
  TextField,
  InputAdornment
} from '@material-ui/core';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import { coursePeriods } from '../utils/coursePeriods';
import { differenceInDays, parseISO, isBefore, isAfter, format, addDays } from 'date-fns';

const useStyles = makeStyles((muiTheme: Theme) =>
  createStyles({
    chartContainer: {
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%)',
      borderRadius: '16px',
      padding: muiTheme.spacing(4),
      border: '2px solid #404040',
      marginTop: muiTheme.spacing(6),
      marginBottom: muiTheme.spacing(4),
      position: 'relative',
      overflow: 'hidden',
    },
    title: {
      color: 'white',
      fontWeight: 600,
      textAlign: 'center',
      marginBottom: muiTheme.spacing(3),
    },
    chartSvg: {
      width: '100%',
      height: '300px',
      background: '#0a0a0a',
      borderRadius: '12px',
      border: '1px solid #333',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: muiTheme.spacing(2),
      marginTop: muiTheme.spacing(3),
    },
    statCard: {
      background: '#2c2c2c',
      borderRadius: '12px',
      padding: muiTheme.spacing(2),
      border: '1px solid #404040',
      textAlign: 'center',
    },
    statValue: {
      color: '#4caf50',
      fontSize: '2rem',
      fontWeight: 700,
      display: 'block',
    },
    statLabel: {
      color: '#ccc',
      fontSize: '0.9rem',
      marginTop: muiTheme.spacing(0.5),
    },
    currentPositionIndicator: {
      color: '#ff9800',
      fontWeight: 600,
      textAlign: 'center',
      marginTop: muiTheme.spacing(2),
      padding: muiTheme.spacing(1),
      background: 'rgba(255, 152, 0, 0.1)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 152, 0, 0.3)',
    },
    progressChip: {
      background: 'linear-gradient(45deg, #4caf50, #66bb6a)',
      color: 'white',
      fontWeight: 600,
      marginBottom: muiTheme.spacing(2),
    },
    inputContainer: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: muiTheme.spacing(3),
    },
    hoursInput: {
      maxWidth: '200px',
      '& .MuiOutlinedInput-root': {
        background: '#2c2c2c',
        '& fieldset': {
          borderColor: '#404040',
        },
        '&:hover fieldset': {
          borderColor: '#666',
        },
        '&.Mui-focused fieldset': {
          borderColor: '#4caf50',
        },
      },
      '& .MuiInputBase-input': {
        color: 'white',
        textAlign: 'center',
      },
      '& .MuiInputLabel-root': {
        color: '#ccc',
      },
      '& .MuiInputLabel-root.Mui-focused': {
        color: '#4caf50',
      },
    },
    equationContainer: {
      background: '#1a1a1a',
      borderRadius: '8px',
      padding: muiTheme.spacing(2),
      marginTop: muiTheme.spacing(2),
      border: '1px solid #333',
    },
    equation: {
      color: '#ccc',
      fontSize: '0.9rem',
      textAlign: 'center',
      fontFamily: 'monospace',
    },
  })
);

interface ExamProgressChartProps {
  courseTitle?: string;
}

const ExamProgressChart: React.FC<ExamProgressChartProps> = ({ 
  courseTitle = "Klinisk medicin 4" 
}) => {
  const classes = useStyles();
  const [totalCourseHours, setTotalCourseHours] = useState(200);

  // Get course data
  const courseData = coursePeriods.find(course => course.title === courseTitle);

  if (!courseData) {
    return (
      <Paper className={classes.chartContainer}>
        <Typography className={classes.title} variant="h5">
          Kunde inte ladda kursdata för {courseTitle}
        </Typography>
      </Paper>
    );
  }

  // Calculate course progress and study recommendations
  const startDate = parseISO(courseData.startDate);
  const endDate = parseISO(courseData.endDate);
  const today = new Date();
  
  const totalDays = differenceInDays(endDate, startDate);
  let currentDays: number;
  
  if (isBefore(today, startDate)) {
    currentDays = 0;
  } else if (isAfter(today, endDate)) {
    currentDays = totalDays;
  } else {
    currentDays = differenceInDays(today, startDate);
  }
  
  const progress = totalDays > 0 ? currentDays / totalDays : 0;
  
  // Mathematical constants for exponential function
  // For Pareto distribution: 80% of effect comes from last 20% of time
  // We use exponential growth: f(x) = a * e^(k*x)
  // Where the last 20% (x ∈ [0.8, 1]) contains 80% of total area
  
  const k = 8.047; // Calculated to satisfy Pareto condition
  const a = k / (Math.exp(k) - 1); // Normalization constant
  
  // Calculate recommended hours per day at current progress
  const getCurrentStudyRate = (x: number): number => {
    return a * Math.exp(k * x);
  };
  
  // Use the adjustable total course hours
  const currentRate = getCurrentStudyRate(progress);
  const dailyHours = currentRate * totalCourseHours;
  
  // Calculate cumulative hours up to current point
  const getCumulativeHours = (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return totalCourseHours;
    return totalCourseHours * (a / k) * (Math.exp(k * x) - 1);
  };
  
  const hoursCompleted = getCumulativeHours(progress);
  const hoursRemaining = totalCourseHours - hoursCompleted;
  const daysRemaining = Math.max(0, totalDays - currentDays);
  
  const calculations = {
    progress: progress * 100,
    currentDays,
    totalDays,
    daysRemaining,
    dailyHours: Math.max(0.5, Math.min(12, dailyHours)), // Cap between 0.5-12 hours
    hoursCompleted,
    hoursRemaining,
    totalCourseHours,
    studyFunction: getCurrentStudyRate,
    a,
    k,
  };

  // Generate chart data points
  const chartData = [];
  const steps = 100;
  
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const y = calculations.studyFunction(x);
    chartData.push({ x, y });
  }

  const maxY = Math.max(...chartData.map(p => p.y));
  const svgWidth = 800;
  const svgHeight = 260;
  const margin = { top: 20, right: 40, bottom: 40, left: 60 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  // Create SVG path for the curve
  const pathData = chartData
    .map((point, index) => {
      const x = margin.left + (point.x * chartWidth);
      const y = margin.top + chartHeight - (point.y / maxY * chartHeight);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Current position marker
  const currentX = margin.left + (calculations.progress / 100 * chartWidth);
  const currentY = margin.top + chartHeight - (calculations.studyFunction(calculations.progress / 100) / maxY * chartHeight);

  // Calculate dates for x-axis labels
  const totalDaysForAxis = calculations.totalDays;

  return (
    <Paper className={classes.chartContainer}>
      <Typography className={classes.title} variant="h5">
        📈 Resan till tentan - Exponentiell studiekurva
      </Typography>
      
      <Chip 
        label={`${calculations.progress.toFixed(1)}% av kursen genomförd`}
        className={classes.progressChip}
      />

      <div className={classes.inputContainer}>
        <TextField
          className={classes.hoursInput}
          label="Totala studietimmar för kursen"
          type="number"
          variant="outlined"
          value={totalCourseHours}
          onChange={(e) => setTotalCourseHours(Math.max(50, Math.min(1000, parseInt(e.target.value) || 200)))}
          InputProps={{
            endAdornment: <InputAdornment position="end" style={{ color: '#ccc' }}>timmar</InputAdornment>,
          }}
          inputProps={{
            min: 50,
            max: 1000,
            step: 10,
          }}
        />
      </div>

      <svg className={classes.chartSvg} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#333" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Axes */}
        <line 
          x1={margin.left} 
          y1={margin.top + chartHeight} 
          x2={margin.left + chartWidth} 
          y2={margin.top + chartHeight} 
          stroke="#666" 
          strokeWidth="2"
        />
        <line 
          x1={margin.left} 
          y1={margin.top} 
          x2={margin.left} 
          y2={margin.top + chartHeight} 
          stroke="#666" 
          strokeWidth="2"
        />
        
        {/* Area under curve */}
        <path 
          d={`${pathData} L ${margin.left + chartWidth} ${margin.top + chartHeight} L ${margin.left} ${margin.top + chartHeight} Z`}
          fill="rgba(76, 175, 80, 0.1)"
          stroke="none"
        />
        
        {/* Main curve */}
        <path 
          d={pathData}
          fill="none" 
          stroke="#4caf50" 
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Pareto line (80% mark) */}
        <line 
          x1={margin.left + (0.8 * chartWidth)} 
          y1={margin.top} 
          x2={margin.left + (0.8 * chartWidth)} 
          y2={margin.top + chartHeight} 
          stroke="#ff5722" 
          strokeWidth="2" 
          strokeDasharray="5,5"
        />
        
        {/* Current position marker */}
        <circle 
          cx={currentX} 
          cy={currentY} 
          r="8" 
          fill="#ff9800" 
          stroke="#fff" 
          strokeWidth="3"
        />
        <line 
          x1={currentX} 
          y1={margin.top} 
          x2={currentX} 
          y2={margin.top + chartHeight} 
          stroke="#ff9800" 
          strokeWidth="2" 
          strokeDasharray="3,3"
        />
        
        {/* Labels */}
        <text x={margin.left + chartWidth/2} y={svgHeight - 5} fill="#ccc" textAnchor="middle" fontSize="12">
          Kursdatum ({courseTitle})
        </text>
        <text x="15" y={margin.top + chartHeight/2} fill="#ccc" textAnchor="middle" fontSize="12" transform={`rotate(-90 15 ${margin.top + chartHeight/2})`}>
          Studietimmar/dag
        </text>
        
        {/* Axis labels - datum */}
        <text x={margin.left} y={margin.top + chartHeight + 20} fill="#888" textAnchor="middle" fontSize="10">
          {format(startDate, 'MMM dd')}
        </text>
        <text x={margin.left + 0.2 * chartWidth} y={margin.top + chartHeight + 20} fill="#888" textAnchor="middle" fontSize="10">
          {format(addDays(startDate, Math.floor(totalDaysForAxis * 0.2)), 'MMM dd')}
        </text>
        <text x={margin.left + 0.5 * chartWidth} y={margin.top + chartHeight + 20} fill="#888" textAnchor="middle" fontSize="10">
          {format(addDays(startDate, Math.floor(totalDaysForAxis * 0.5)), 'MMM dd')}
        </text>
        <text x={margin.left + 0.8 * chartWidth} y={margin.top + chartHeight + 20} fill="#ff5722" textAnchor="middle" fontSize="10">
          {format(addDays(startDate, Math.floor(totalDaysForAxis * 0.8)), 'MMM dd')} (80%)
        </text>
        <text x={margin.left + chartWidth} y={margin.top + chartHeight + 20} fill="#888" textAnchor="middle" fontSize="10">
          {format(endDate, 'MMM dd')}
        </text>
        
        {/* Current position label */}
        <text x={currentX} y={margin.top - 5} fill="#ff9800" textAnchor="middle" fontSize="12" fontWeight="bold">
          DU ÄR HÄR
        </text>
      </svg>

      <div className={classes.currentPositionIndicator}>
        📍 Du befinner dig på {calculations.progress.toFixed(1)}% av kursens längd
      </div>

      <div className={classes.statsGrid}>
        <div className={classes.statCard}>
          <span className={classes.statValue}>
            {calculations.dailyHours.toFixed(1)}h
          </span>
          <div className={classes.statLabel}>
            Rekommenderade timmar/dag just nu
          </div>
        </div>
        
        <div className={classes.statCard}>
          <span className={classes.statValue}>
            {calculations.daysRemaining}
          </span>
          <div className={classes.statLabel}>
            Dagar kvar till tentamen
          </div>
        </div>
        
        <div className={classes.statCard}>
          <span className={classes.statValue}>
            {calculations.hoursCompleted.toFixed(0)}h
          </span>
          <div className={classes.statLabel}>
            Timmar genomförda (enligt kurva)
          </div>
        </div>
        
        <div className={classes.statCard}>
          <span className={classes.statValue}>
            {calculations.hoursRemaining.toFixed(0)}h
          </span>
          <div className={classes.statLabel}>
            Timmar kvar att plugga
          </div>
        </div>
      </div>

             <div className={classes.equationContainer}>
         <Typography className={classes.equation}>
           📐 Exponentiell funktion: f(x) = {calculations.a.toFixed(3)} × e^({calculations.k.toFixed(3)}x)
         </Typography>
         <Typography className={classes.equation} style={{ marginTop: 8 }}>
           🎯 Pareto-principen: 80% av studierna (röd linje) ligger i de sista 20% av kursen
         </Typography>
         <Typography className={classes.equation} style={{ marginTop: 8 }}>
           ⚙️ Justera "Totala studietimmar" ovan för att anpassa kurvan till dina behov
         </Typography>
       </div>
    </Paper>
  );
};

export default ExamProgressChart; 