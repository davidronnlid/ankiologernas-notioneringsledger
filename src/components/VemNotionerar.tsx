import { Checkbox, FormControlLabel } from "@mui/material";
import { useSelector } from "react-redux";
import { useState, useEffect } from "react";
import { RootState } from "store/types";
import { useDispatch } from "react-redux";
import { updateCheckboxStateThunk } from "store/updateCheckboxStateThunk";

interface Props {
  lectureID: string;
}

const VemNotionerar: React.FC<Props> = ({ lectureID }) => {
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [confirmedDisabled, setConfirmedDisabled] = useState<boolean>(true);
  const dispatch = useDispatch();

  // Extract full_name from Redux store's auth slice
  const full_name = useSelector(
    (state: RootState) => state.auth.user?.full_name
  );

  const [checkedNames, setCheckedNames] = useState<Record<string, boolean>>({
    Mattias: false,
    Albin: false,
    David: false,
  });

  const canCheck = (label: string) => {
    return full_name?.includes(label);
  };

  const handleCheckboxChange = (name: string, isChecked: boolean) => {
    setCheckedNames((prevState) => ({
      ...prevState,
      [name]: isChecked,
    }));

    if (full_name?.includes(name)) {
      if (!isChecked) {
        setConfirmed(false);
      }
      setConfirmedDisabled(false);
    }
    const newCheckboxState = { ...checkedNames, [name]: isChecked }; // renamed variable here
    setCheckedNames(newCheckboxState);

    dispatch(
      updateCheckboxStateThunk({ lectureID, newCheckboxState, confirmed }) // use newCheckboxState here instead of newCheckedNames
    );
  };

  useEffect(() => {
    if (full_name) {
      const ownCheckboxChecked =
        checkedNames[
          full_name
            .split(" ")
            .find((name) =>
              ["Mattias", "Albin", "David"].includes(name)
            ) as keyof typeof checkedNames
        ];
      const otherCheckboxesUnchecked = ["Mattias", "Albin", "David"].every(
        (name) => {
          if (full_name.includes(name)) {
            return checkedNames[name as keyof typeof checkedNames];
          }
          return !checkedNames[name as keyof typeof checkedNames];
        }
      );

      setConfirmed(ownCheckboxChecked && otherCheckboxesUnchecked);
    }
  }, [checkedNames, full_name]);

  return (
    <div>
      {["Mattias", "Albin", "David"].map((name) => (
        <FormControlLabel
          key={name}
          control={
            <Checkbox
              disabled={!canCheck(name)}
              checked={checkedNames[name]}
              onChange={(e) => handleCheckboxChange(name, e.target.checked)}
            />
          }
          label={name}
        />
      ))}
      <FormControlLabel
        control={
          <Checkbox
            checked={confirmed}
            disabled={confirmedDisabled}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
        }
        label="Confirmed"
      />
    </div>
  );
};

export default VemNotionerar;
