import { Checkbox, FormControlLabel } from "@mui/material";
import { useSelector } from "react-redux";
import { useState, useEffect } from "react";
import { RootState } from "store/types";

function VemNotionerar() {
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [confirmedDisabled, setConfirmedDisabled] = useState<boolean>(true);

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

    // If the current checkbox being modified is the user's own name
    if (full_name?.includes(name)) {
      // If unchecked, set confirmed to false, but keep the confirmed checkbox enabled
      if (!isChecked) {
        setConfirmed(false);
      }
      // Always enable the confirmed checkbox when the user's name checkbox is modified
      setConfirmedDisabled(false);
    }
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
}

export default VemNotionerar;
