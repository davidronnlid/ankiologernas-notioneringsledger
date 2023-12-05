import { Checkbox, FormControlLabel } from "@mui/material";
import { useSelector } from "react-redux";
import { useState } from "react";
import { RootState } from "store/types";
import { useDispatch } from "react-redux";
import { updateCheckboxStateThunk } from "store/updateCheckboxStateThunk";
import { CheckboxState } from "types/lecture";

// Then use this interface in your Props definition
interface Props {
  lectureID: string;
  checkboxState: CheckboxState;
}

// Assuming checkboxState is passed in with the new structure
const VemNotionerar: React.FC<Props> = ({ lectureID, checkboxState }) => {
  const dispatch = useDispatch();
  const full_name = useSelector(
    (state: RootState) => state.auth.user?.full_name
  );

  // Since the state now contains objects with confirm and unwish, the initial state setup will change
  const [checkedState, setCheckedState] = useState(checkboxState);

  const handleCheckboxChange = (
    name: string,
    field: "confirm" | "unwish",
    isChecked: boolean
  ) => {
    setCheckedState((prevState) => {
      const newStateForName = {
        ...prevState[name],
        [field]: isChecked,
      };

      // We return the updated state immediately for use in the dispatch
      const updatedState = {
        ...prevState,
        [name]: newStateForName,
      };

      // Dispatch the action using the immediately updated state
      dispatch(
        updateCheckboxStateThunk({
          lectureID,
          newCheckboxState: updatedState,
        })
      );

      // Return the updated state to update the component's state
      return updatedState;
    });
  };

  const canCheck = (label: string) => {
    return full_name?.toLowerCase().includes(label.toLowerCase());
  };

  return (
    <div>
      {Object.entries(checkedState).map(([name, { confirm, unwish }]) => {
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
      })}
    </div>
  );
};

export default VemNotionerar;
