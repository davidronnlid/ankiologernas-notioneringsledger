// components/FetchICSButton.tsx

import React from "react";
import Button from "@material-ui/core/Button";

const FetchICSButton: React.FC = () => {
  const handleFetchICS = async () => {
    try {
      const apiUrl =
        process.env.NODE_ENV === "development"
          ? process.env.NEXT_PUBLIC_API_URL
          : "/.netlify";

      const response = await fetch(`${apiUrl}/functions/processICS`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error("Error fetching ICS data:", error);
    }
  };

  return (
    <Button variant="contained" color="primary" onClick={handleFetchICS}>
      Fetch ICS Data
    </Button>
  );
};

export default FetchICSButton;
