import React, { useState, FormEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/types";
import {
  CircularProgress,
  IconButton,
  TextareaAutosize,
} from "@material-ui/core";
import styles from "../styles/Comment.module.css";
import Chat from "@material-ui/icons/Chat";
import { addComment } from "store/slices/commentsReducer";

interface PostCommentProps {
  lectureId: string;
}

const PostComment = ({ lectureId }: PostCommentProps) => {
  const [comment, setComment] = useState("");
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const fullName = useSelector(
    (state: RootState) => state.auth.user?.full_name
  );
  const allowedNames = ["David Rönnlid", "Albin Lindberg", "Mattias Österdahl"];
  const isAllowedToComment = fullName ? allowedNames.includes(fullName) : false;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!comment) return;

    console.log("adding comment to lecture: ", lectureId);

    setIsLoading(true);

    try {
      const apiUrl =
        process.env.NODE_ENV === "development"
          ? process.env.NEXT_PUBLIC_API_URL
          : "/.netlify";
      const response = await fetch(`${apiUrl}/functions/CRUDFLData`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lectureId, comment, fullName }),
      });

      const responseJson = await response.json();
      console.log(
        "🚀 ~ file: PostComment.tsx:43 ~ handleSubmit ~ responseJson:",
        responseJson
      );

      if (response.ok) {
        // Dispatch the addComment action with the lectureId and the new comment

        dispatch(addComment({ comment: responseJson }));
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error saving comment:", error);
      // Optionally handle error in UI
    } finally {
      setIsLoading(false);
    }
  };
  if (!isAllowedToComment) {
    // If the user's name is not in the list, do not show the comment box
    return null;
  }
  return (
    <div className={styles.commentContainer}>
      <form onSubmit={handleSubmit} className={styles.commentForm}>
        <div className={styles.commentTextareaContainer}>
          <TextareaAutosize
            className={styles.commentTextarea}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Skriv kommentar..."
          />
          <IconButton type="submit" className={styles.commentSubmitIcon}>
            {isLoading ? <CircularProgress size={24} /> : <Chat />}
          </IconButton>
        </div>
      </form>
    </div>
  );
};

export default PostComment;
