import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Chip,
} from "@material-ui/core";
import {
  makeStyles,
  Theme,
  createStyles,
} from "@material-ui/core/styles";
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  Title as TitleIcon,
} from "@material-ui/icons";
import Lecture from "types/lecture";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    dialog: {
      "& .MuiDialog-paper": {
        background: "linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #5c6bc0 100%)",
        borderRadius: "16px",
        border: "2px solid rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(10px)",
        minWidth: "400px",
      },
    },
    dialogTitle: {
      background: "rgba(255, 255, 255, 0.1)",
      color: "white",
      borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
    },
    titleText: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontWeight: 600,
    },
    closeButton: {
      color: "rgba(255, 255, 255, 0.8)",
      "&:hover": {
        color: "white",
        background: "rgba(255, 255, 255, 0.1)",
      },
    },
    dialogContent: {
      padding: 24,
      background: "rgba(255, 255, 255, 0.05)",
    },
    formSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
      color: "rgba(255, 255, 255, 0.9)",
      fontWeight: 500,
      fontSize: "0.9rem",
    },
    textField: {
      "& .MuiInputLabel-root": {
        color: "rgba(255, 255, 255, 0.7)",
      },
      "& .MuiInputLabel-root.Mui-focused": {
        color: "rgba(255, 255, 255, 0.9)",
      },
      "& .MuiOutlinedInput-root": {
        color: "white",
        "& fieldset": {
          borderColor: "rgba(255, 255, 255, 0.3)",
        },
        "&:hover fieldset": {
          borderColor: "rgba(255, 255, 255, 0.5)",
        },
        "&.Mui-focused fieldset": {
          borderColor: "rgba(255, 255, 255, 0.8)",
        },
      },
      "& .MuiInputBase-input": {
        color: "white",
      },
    },
    timeSection: {
      display: "grid",
      gridTemplateColumns: "1fr auto 1fr",
      gap: 16,
      alignItems: "end",
    },
    timeField: {
      minWidth: "100px",
    },
    durationChip: {
      background: "rgba(76, 175, 80, 0.2)",
      color: "rgba(76, 175, 80, 1)",
      border: "1px solid rgba(76, 175, 80, 0.5)",
      fontWeight: "bold",
      marginTop: 8,
    },
    errorText: {
      color: "#ff6b6b",
      fontSize: "0.8rem",
      marginTop: 8,
    },
    infoText: {
      color: "rgba(255, 255, 255, 0.6)",
      fontSize: "0.8rem",
      fontStyle: "italic",
      marginTop: 8,
    },
    dialogActions: {
      padding: 16,
      background: "rgba(255, 255, 255, 0.05)",
      borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      gap: 12,
    },
    cancelButton: {
      color: "rgba(255, 255, 255, 0.7)",
      borderColor: "rgba(255, 255, 255, 0.3)",
      "&:hover": {
        borderColor: "rgba(255, 255, 255, 0.5)",
        background: "rgba(255, 255, 255, 0.05)",
      },
    },
    updateButton: {
      background: "linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)",
      color: "white",
      fontWeight: "bold",
      "&:hover": {
        background: "linear-gradient(45deg, #45a049 30%, #5cb85c 90%)",
        transform: "translateY(-1px)",
        boxShadow: "0 4px 12px rgba(76, 175, 80, 0.4)",
      },
      "&:disabled": {
        background: "rgba(255, 255, 255, 0.1)",
        color: "rgba(255, 255, 255, 0.3)",
      },
    },
  })
);

interface EditLectureModalProps {
  open: boolean;
  lecture: Lecture | null;
  onClose: () => void;
  onUpdate: (lectureData: {
    id: string;
    title: string;
    date: string;
    time: string;
    duration: number;
  }) => void;
  isLoading?: boolean;
}

const EditLectureModal: React.FC<EditLectureModalProps> = ({
  open,
  lecture,
  onClose,
  onUpdate,
  isLoading = false,
}) => {
  const classes = useStyles();
  const lecturesData = useSelector((state: RootState) => state.lectures.lectures);
  
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);

  // Get all lectures for uniqueness checking
  const allLectures: Lecture[] = lecturesData.flatMap(week => week.lectures);

  // Calculate duration between start and end time
  const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startParts = start.split(":").map(Number);
    const endParts = end.split(":").map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];
    return Math.max(0, (endMinutes - startMinutes) / 60);
  };

  const duration = calculateDuration(startTime, endTime);

  // Initialize form when lecture changes
  useEffect(() => {
    if (lecture) {
      setTitle(lecture.title);
      setDate(lecture.date);
      
      // Parse time if it exists
      if (lecture.time) {
        const timeParts = lecture.time.split("-");
        setStartTime(timeParts[0] || "09:00");
        setEndTime(timeParts[1] || "10:00");
      } else {
        setStartTime("09:00");
        setEndTime("10:00");
      }
      
      setErrors({});
      setTitleSuggestions([]);
    }
  }, [lecture]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setTitle("");
      setDate("");
      setStartTime("09:00");
      setEndTime("10:00");
      setErrors({});
      setTitleSuggestions([]);
    }
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = "Titel är obligatorisk";
    } else {
      // Check for unique title (excluding the current lecture being edited)
      if (!isLectureTitleUnique(title.trim(), allLectures, lecture?.id)) {
        const suggestions = generateUniqueTitleSuggestions(title.trim(), allLectures);
        newErrors.title = `En annan föreläsning med denna titel finns redan. ${
          suggestions.length > 0 
            ? `Förslag: ${suggestions.slice(0, 2).join(", ")}` 
            : 'Vänligen välj en annan titel.'
        }`;
        setTitleSuggestions(suggestions);
      } else {
        setTitleSuggestions([]);
      }
    }

    if (!date) {
      newErrors.date = "Datum är obligatoriskt";
    } else {
      // Check if date is in the past
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = "Datum kan inte vara i det förflutna";
      }
    }

    // Validate time
    if (startTime && endTime && startTime >= endTime) {
      newErrors.time = "Sluttid måste vara efter starttid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm() && lecture) {
      const timeString = `${startTime}-${endTime}`;
      
      onUpdate({
        id: lecture.id,
        title: title.trim(),
        date,
        time: timeString,
        duration,
      });
    }
  };

  const handleClose = () => {
    setErrors({});
    setTitleSuggestions([]);
    onClose();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setTitle(suggestion);
    setTitleSuggestions([]);
    setErrors(prev => ({ ...prev, title: "" }));
  };

  if (!lecture) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      className={classes.dialog}
    >
      <DialogTitle className={classes.dialogTitle}>
        <div className={classes.titleText}>
          <EditIcon />
          Redigera Föreläsning
        </div>
        <IconButton onClick={handleClose} className={classes.closeButton}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent className={classes.dialogContent}>
        <div className={classes.formSection}>
          <div className={classes.sectionTitle}>
            <TitleIcon />
            Föreläsningstitel
          </div>
          <TextField
            fullWidth
            variant="outlined"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={classes.textField}
            placeholder="T.ex. Introduktion till Kardiologi"
            error={!!errors.title}
            helperText={errors.title}
          />
          
          {/* Title suggestions */}
          {titleSuggestions.length > 0 && (
            <Box mt={1}>
              <Typography variant="body2" style={{ color: "rgba(255, 255, 255, 0.7)", marginBottom: 8 }}>
                💡 Förslag för unika titlar:
              </Typography>
              {titleSuggestions.map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  style={{
                    marginRight: 8,
                    marginBottom: 4,
                    backgroundColor: "rgba(33, 150, 243, 0.2)",
                    color: "white",
                    border: "1px solid rgba(33, 150, 243, 0.5)",
                    cursor: "pointer"
                  }}
                  size="small"
                />
              ))}
            </Box>
          )}
        </div>

        <div className={classes.formSection}>
          <div className={classes.sectionTitle}>
            <ScheduleIcon />
            Datum och tid
          </div>
          
          <TextField
            fullWidth
            type="date"
            variant="outlined"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={classes.textField}
            error={!!errors.date}
            helperText={errors.date}
            style={{ marginBottom: 16 }}
          />

          <div className={classes.timeSection}>
            <TextField
              type="time"
              variant="outlined"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={`${classes.textField} ${classes.timeField}`}
              inputProps={{ step: 300 }}
            />
            <Typography variant="body2" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
              till
            </Typography>
            <TextField
              type="time"
              variant="outlined"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={`${classes.textField} ${classes.timeField}`}
              inputProps={{ step: 300 }}
              error={!!errors.time}
            />
          </div>

          {errors.time && (
            <Typography className={classes.errorText}>
              {errors.time}
            </Typography>
          )}

          <Chip
            label={`${duration.toFixed(1)} timmar`}
            className={classes.durationChip}
          />

          <Typography className={classes.infoText}>
            Föreläsningen kommer att uppdateras med den nya informationen.
          </Typography>
        </div>
      </DialogContent>

      <DialogActions className={classes.dialogActions}>
        <Button onClick={handleClose} variant="outlined" className={classes.cancelButton}>
          AVBRYT
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          className={classes.updateButton}
          disabled={!title.trim() || !date || isLoading}
        >
          {isLoading ? "UPPDATERAR..." : "UPPDATERA FÖRELÄSNING"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditLectureModal;