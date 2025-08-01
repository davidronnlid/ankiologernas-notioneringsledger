import React, { useState, useEffect } from "react";
import {
  Snackbar,
  Paper,
  Box,
  Typography,
  Chip,
  Collapse,
  IconButton,
} from "@material-ui/core";
import {
  makeStyles,
  Theme,
  createStyles,
} from "@material-ui/core/styles";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Close as CloseIcon,
} from "@material-ui/icons";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    alert: {
      background: "linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #5c6bc0 100%)",
      color: "white",
      border: "2px solid rgba(255, 255, 255, 0.2)",
      borderRadius: "12px",
      backdropFilter: "blur(10px)",
    },
    alertTitle: {
      color: "white",
      fontWeight: 600,
    },
    alertMessage: {
      color: "rgba(255, 255, 255, 0.9)",
    },
    duplicateList: {
      marginTop: theme.spacing(1),
      maxHeight: "200px",
      overflow: "auto",
    },
    duplicateChip: {
      background: "rgba(255, 255, 255, 0.2)",
      color: "white",
      margin: "2px",
      fontSize: "0.8rem",
    },
    expandButton: {
      color: "rgba(255, 255, 255, 0.8)",
      padding: theme.spacing(0.5),
      "&:hover": {
        color: "white",
        background: "rgba(255, 255, 255, 0.1)",
      },
    },
    closeButton: {
      color: "rgba(255, 255, 255, 0.8)",
      "&:hover": {
        color: "white",
      },
    },
  })
);

interface DuplicateRemovalNotificationProps {
  removedDuplicates: string[];
  totalRemoved: number;
  onClose: () => void;
}

const DuplicateRemovalNotification: React.FC<DuplicateRemovalNotificationProps> = ({
  removedDuplicates,
  totalRemoved,
  onClose,
}) => {
  const classes = useStyles();
  const [expanded, setExpanded] = useState(false);

  if (totalRemoved === 0) return null;

  return (
    <Snackbar
      open={true}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      autoHideDuration={10000}
      onClose={onClose}
    >
      <Paper className={classes.alert}>
        <Box display="flex" alignItems="center" justifyContent="space-between" p={2}>
          <Box flex={1}>
            <Typography variant="h6" className={classes.alertTitle}>
              🧹 Duplicerade föreläsningar rensade
            </Typography>
            <Typography className={classes.alertMessage}>
              {totalRemoved} duplicerade föreläsningar med samma titel har tagits bort för att undvika förvirring.
            </Typography>
            
            <Collapse in={expanded}>
              <Box className={classes.duplicateList}>
                <Typography variant="caption" style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                  Borttagna duplicerade föreläsningar:
                </Typography>
                <Box mt={1}>
                  {removedDuplicates.map((title, index) => (
                    <Chip
                      key={index}
                      label={title}
                      size="small"
                      className={classes.duplicateChip}
                    />
                  ))}
                </Box>
              </Box>
            </Collapse>
          </Box>
          
          <Box display="flex" alignItems="center">
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              className={classes.expandButton}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <IconButton
              size="small"
              onClick={onClose}
              className={classes.closeButton}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>
    </Snackbar>
  );
};

export default DuplicateRemovalNotification; 