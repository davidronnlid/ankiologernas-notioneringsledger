import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { Comment } from "../../types/lecture";

const initialState: any = {
  comments: {},
};

const commentsSlice = createSlice({
  name: "comments",
  initialState,
  reducers: {
    addComment: (state, action: PayloadAction<{ comment: Comment }>) => {
      const { comment } = action.payload;
      console.log("Reducer: addComment called with payload:", comment);

      if (!state.comments[comment.lectureId]) {
        state.comments[comment.lectureId] = [];
      }
      state.comments[comment.lectureId].push(comment);

      console.log(
        `Updated comments for lectureId ${comment.lectureId}:`,
        state.comments[comment.lectureId]
      );
    },
    deleteComment: (
      state,
      action: PayloadAction<{ lectureId: string; commentId: string }>
    ) => {
      const { lectureId, commentId } = action.payload;

      // Filter out the deleted comment
      state.comments[lectureId] = state.comments[lectureId].filter(
        (comment: Comment) => comment.commentId !== commentId
      );
    },
  },
});

export const { addComment, deleteComment } = commentsSlice.actions;

export default commentsSlice.reducer;
