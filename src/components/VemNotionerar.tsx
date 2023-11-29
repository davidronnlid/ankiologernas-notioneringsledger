import { Checkbox, FormControlLabel } from "@mui/material";
import { useSelector } from "react-redux";
import { useState, useEffect } from "react";
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

    dispatch(
      updateCheckboxStateThunk({ lectureID, newCheckboxState }) // use newCheckboxState here instead of newCheckedNames
    );
  };

  return (
    <div>
      {["Mattias", "Albin", "David"].map((name) => (
        <FormControlLabel
          key={name}
          control={
            <Checkbox
              disabled={!canCheck(name)}
              checked={checkedNames?.[name]}
              onChange={(e) => handleCheckboxChange(name, e.target.checked)}
            />
          }
          label={name}
        />
      ))}
    </div>
  );
};

export default VemNotionerar;
