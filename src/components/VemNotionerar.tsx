import { Checkbox, FormControlLabel } from "@mui/material";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { RootState } from "store/types";
import { useDispatch } from "react-redux";
import { updateCheckboxStateThunk } from "store/updateCheckboxStateThunk";
import { updateLectureCheckboxState } from "store/slices/lecturesReducer";
import Lecture, { CheckboxState } from "types/lecture";

// Then use this interface in your Props definition
interface Props {
  lectureID: string;
  checkboxState: CheckboxState;
}

// Assuming checkboxState is passed in with the new structure
const VemNotionerar: React.FC<Props> = ({ lectureID }) => {
  const dispatch = useDispatch();
  const full_name = useSelector(
    (state: RootState) => state.auth.user?.full_name
  );

  const lecturesData = useSelector(
    (state: RootState) => state.lectures.lectures
  );

  // Find the lecture by ID and get its checkboxState
  const lecture = lecturesData
    .flatMap((week) => week.lectures)
    .find((lecture: Lecture) => lecture.id === lectureID);

  const handleCheckboxChange = (
    name: string,
    field: "confirm" | "unwish",
    isChecked: boolean
  ) => {
    if (lecture) {
      const updatedState = {
        ...lecture.checkboxState,
        [name]: {
          ...lecture.checkboxState[name],
          [field]: isChecked,
        },
      };

      // Dispatch the action using the immediately updated state
      dispatch(
        updateCheckboxStateThunk({
          lectureID,
          newCheckboxState: updatedState,
        })
      );
      dispatch(
        updateLectureCheckboxState({
          lectureID,
          newCheckboxState: updatedState,
        })
      );

      // Return the updated state to update the component's state
      return updatedState;
    }
  };

  const canCheck = (label: string) => {
    return full_name?.toLowerCase().includes(label.toLowerCase());
  };

  return (
    <div>
      {lecture &&
        Object.entries(lecture.checkboxState).map(
          ([name, { confirm, unwish }]) => {
            const isAbleToCheck = canCheck(name);
            return (
              <div key={name}>
                <FormControlLabel
                  control={
                    <Checkbox
                      disabled={!isAbleToCheck}
                      checked={confirm}
                      onChange={(e) =>
                        handleCheckboxChange(name, "confirm", e.target.checked)
                      }
                      sx={{
                        color: isAbleToCheck ? "limegreen" : "grey", // Checkbox color when not disabled
                        "&.Mui-disabled": {
                          color: "grey", // Checkbox color when disabled
                        },
                      }}
                    />
                  }
                  label={`${name}`} // Modified label
                  labelPlacement="start"
                  sx={{
                    // Apply a color to the text itself
                    ".MuiTypography-root": {
                      color: isAbleToCheck ? "white" : "lightgrey", // Text color
                    },
                    // If you still need to target the disabled label specifically:
                    "&.Mui-disabled": {
                      ".MuiTypography-root": {
                        color: "lightgrey", // Text color when disabled
                      },
                    },
                    // Remove the opacity from Material-UI disabled label
                    opacity: 1,
                    color: isAbleToCheck ? "white" : "grey", // Ensures label color is set
                    "& .MuiFormControlLabel-label": {
                      color: isAbleToCheck ? "white" : "grey", // Ensures label color is set
                    },
                  }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      disabled={!isAbleToCheck}
                      checked={unwish}
                      onChange={(e) =>
                        handleCheckboxChange(name, "unwish", e.target.checked)
                      }
                      sx={{
                        color: isAbleToCheck ? "red" : "grey", // Checkbox color when not disabled
                        "&.Mui-disabled": {
                          color: "grey", // Checkbox color when disabled
                        },
                      }}
                    />
                  }
                  label={``} // Modified label
                  sx={{
                    // Apply a color to the text itself
                    ".MuiTypography-root": {
                      color: isAbleToCheck ? "white" : "lightgrey", // Text color
                    },
                    // If you still need to target the disabled label specifically:
                    "&.Mui-disabled": {
                      ".MuiTypography-root": {
                        color: "lightgrey", // Text color when disabled
                      },
                    },
                    // Remove the opacity from Material-UI disabled label
                    opacity: 1,
                    color: isAbleToCheck ? "white" : "grey", // Ensures label color is set
                    "& .MuiFormControlLabel-label": {
                      color: isAbleToCheck ? "white" : "grey", // Ensures label color is set
                    },
                  }}
                />
              </div>
            );
          }
        )}
    </div>
  );
};

export default VemNotionerar;
