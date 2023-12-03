import React, { useState, FormEvent } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store/types";
import { IconButton, TextareaAutosize } from "@material-ui/core";
import styles from "../styles/Comment.module.css";
import Chat from "@material-ui/icons/Chat";

interface PostCommentProps {
  lectureId: string;
}

const PostComment = ({ lectureId }: PostCommentProps) => {
  const [comment, setComment] = useState("");
  const fullName = useSelector(
    (state: RootState) => state.auth.user?.full_name
  );
  const allowedNames = ["David Rönnlid", "Albin Lindber", "Mattias Österdahl"];
  const isAllowedToComment = allowedNames.includes(fullName);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!comment) return;

    console.log("adding comment to lecture: ", lectureId);

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setComment("");
      // Optionally refresh comments or handle UI update
    } catch (error) {
      console.error("Error saving comment:", error);
      // Optionally handle error in UI
    }
  };
  if (!isAllowedToComment) {
    // If the user's name is not in the list, do not show the comment box
    return null; // or some other appropriate response
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
            <Chat />
          </IconButton>
        </div>
      </form>
    </div>
  );
};

export default PostComment;
