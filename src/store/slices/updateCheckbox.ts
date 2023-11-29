import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { updateCheckboxStateThunk } from "store/updateCheckboxStateThunk";

interface CheckboxState {
  loading: "idle" | "pending";
  error: null | string | undefined;
  modifiedCount: number;
}

const initialState: CheckboxState = {
  loading: "idle",
  error: null,
  modifiedCount: 0,
};

const checkboxSlice = createSlice({
  name: "checkbox",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(updateCheckboxStateThunk.pending, (state) => {
        state.loading = "pending";
      })
      .addCase(
        updateCheckboxStateThunk.fulfilled,
        (state, action: PayloadAction<{ modifiedCount: number }>) => {
          state.loading = "idle";
          state.modifiedCount = action.payload.modifiedCount;
        }
      )
      .addCase(updateCheckboxStateThunk.rejected, (state, action) => {
        state.loading = "idle";
        if (action.error) {
          state.error = action.error.message;
        }
      });
  },
});

export default checkboxSlice.reducer;
