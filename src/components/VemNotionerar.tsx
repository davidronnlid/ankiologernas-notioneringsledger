import { Checkbox, FormControlLabel } from "@mui/material";
import { useSelector } from "react-redux";
import { useState } from "react";
import { RootState } from "store/types";
import { useDispatch } from "react-redux";
import { updateCheckboxStateThunk } from "store/updateCheckboxStateThunk";

interface Props {
  lectureID: string;
  checkboxState: Record<string, boolean>;
}

const VemNotionerar: React.FC<Props> = ({ lectureID, checkboxState }) => {
  const dispatch = useDispatch();

  // Extract full_name from Redux store's auth slice
  const full_name = useSelector(
    (state: RootState) => state.auth.user?.full_name
  );

  const [checkedNames, setCheckedNames] =
    useState<Record<string, boolean>>(checkboxState);

  const canCheck = (label: string) => {
    return full_name?.includes(label);
  };

  const handleCheckboxChange = (name: string, isChecked: boolean) => {
    setCheckedNames((prevState) => ({
      ...prevState,
      [name]: isChecked,
    }));

    const newCheckboxState = { ...checkedNames, [name]: isChecked }; // renamed variable here
    console.log("updated newCheckboxState to:", newCheckboxState);
    setCheckedNames(newCheckboxState);

    dispatch(updateCheckboxStateThunk({ lectureID, newCheckboxState }));
  };

  return (
    <div>
      {Object.entries(checkedNames).map(([name, isChecked]) => {
        const isAbleToCheck = canCheck(name);
        return (
          <FormControlLabel
            key={name}
            control={
              <Checkbox
                disabled={!isAbleToCheck}
                checked={isChecked}
                onChange={(e) => handleCheckboxChange(name, e.target.checked)}
                sx={{
                  color: isAbleToCheck ? "white" : "grey", // Checkbox color when not disabled
                  "&.Mui-disabled": {
                    color: "grey", // Checkbox color when disabled
                  },
                }}
              />
            }
            label={name}
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
        );
      })}
    </div>
  );
};

export default VemNotionerar;
