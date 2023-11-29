import { createAsyncThunk } from "@reduxjs/toolkit";

export const updateCheckboxStateThunk = createAsyncThunk(
  "checkbox/updateState",
  async (params: {
    lectureID: string;
    newCheckboxState: Record<string, boolean>;
  }) => {
    const response = await fetch(
      "http://localhost:8888/.netlify/functions/CRUDFLData",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update checkbox state");
    }

    return await response.json();
  }
);
