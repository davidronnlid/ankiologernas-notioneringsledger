import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { WeekData } from "@/types";
import Lecture, { CheckboxState } from "types/lecture";

interface LecturesState {
  lectures: WeekData[];
}

const initialState: LecturesState = {
  lectures: [],
};

const lecturesSlice = createSlice({
  name: "lectures",
  initialState,
  reducers: {
    setLectures(state, action: PayloadAction<WeekData[]>) {
      console.log("Dispatching setLectures with payload:", action.payload);

      state.lectures = action.payload;
    },
    updateLectureCheckboxState(
      state,
      action: PayloadAction<{
        lectureID: string;
        newCheckboxState: CheckboxState;
      }>
    ) {
      const { lectureID, newCheckboxState } = action.payload;
      // Find the lecture and update its checkboxState
      state.lectures.forEach((weekData) => {
        const lecture = weekData.lectures.find(
          (lecture: Lecture) => lecture.id === lectureID
        );
        if (lecture) {
          lecture.checkboxState = newCheckboxState;
        }
      });
    },
  },
});

export const { setLectures, updateLectureCheckboxState } =
  lecturesSlice.actions;
export default lecturesSlice.reducer;
