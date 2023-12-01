import React, { useState, useEffect } from "react";
import styles from "../styles/Comment.module.css";
import { IconButton, Typography } from "@material-ui/core";
import { Comment } from "types/lecture";
import DeleteIcon from "@material-ui/icons/Delete";
import { RootState } from "store/types";
import { useSelector } from "react-redux";

interface DisplayCommentsProps {
  lectureId: string;
  comments: Comment[];
}

const DisplayComments: React.FC<DisplayCommentsProps> = ({
  lectureId,
  comments,
}) => {
  const fullName = useSelector(
    (state: RootState) => state.auth.user?.full_name
  );
  const handleDeleteComment = async (lectureId: string, commentId: string) => {
    // API call to delete the comment
    console.log("lectureId", lectureId, "commentId", commentId);
    try {
      const response = await fetch(
        `http://localhost:8888/.netlify/functions/CRUDFLData?lectureId=${lectureId}&commentId=${commentId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ lectureId, commentId }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("Comment deleted successfully");
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };
  return (
    <div className={styles.commentsContainer}>
      <Typography variant="subtitle2" style={{ color: "white" }}>
        Kommentarer:
      </Typography>
      {comments.length > 0 ? (
        comments.map((comment) => (
          <div key={comment.commentId} className={styles.comment}>
            <div className={styles.commentHeader}>
              <span className={styles.commentFullName}>{comment.fullName}</span>
            </div>
            <Typography variant="body2" className={styles.commentText}>
              {comment.comment}
            </Typography>{" "}
            {fullName === comment.fullName && (
              <IconButton
                className={styles.commentDeleteButton}
                onClick={() =>
                  handleDeleteComment(lectureId, comment.commentId)
                }
                aria-label="delete"
                size="small"
              >
                <DeleteIcon className={styles.commentIcon} />
              </IconButton>
            )}
          </div>
        ))
      ) : (
        <Typography variant="body2" style={{ color: "white" }}>
          Inga kommentarer.
        </Typography>
      )}
    </div>
  );
};

export default DisplayComments;
