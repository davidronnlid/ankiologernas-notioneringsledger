import { createAsyncThunk } from "@reduxjs/toolkit";
import { CheckboxState } from "types/lecture";

export const updateCheckboxStateThunk = createAsyncThunk(
  "checkbox/updateState",
  async (params: { lectureID: string; newCheckboxState: CheckboxState }) => {
    const apiUrl =
      process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_API_URL
        : "/.netlify";
    const response = await fetch(`${apiUrl}/functions/CRUDFLData`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Failed to update checkbox state");
    }

    return await response.json();
  }
);
