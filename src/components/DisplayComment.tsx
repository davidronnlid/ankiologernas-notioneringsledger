import React from "react";
import styles from "../styles/Comment.module.css";
import { IconButton, Typography } from "@material-ui/core";
import { Comment } from "types/lecture";
import DeleteIcon from "@material-ui/icons/Delete";
import { RootState } from "store/types";
import { useSelector } from "react-redux";
import Image from "next/image";

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
  const profile_pic = useSelector(
    (state: RootState) => state.auth.user?.profile_pic
  );

  const handleDeleteComment = async (lectureId: string, commentId: string) => {
    // API call to delete the comment
    console.log("lectureId", lectureId, "commentId", commentId);
    try {
      const apiUrl =
        process.env.NODE_ENV === "development"
          ? process.env.NEXT_PUBLIC_API_URL
          : "";

      const response = await fetch(
        `${apiUrl}/.netlify/functions/CRUDFLData?lectureId=${lectureId}&commentId=${commentId}`,
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
      {comments.length > 0 ? (
        comments.map((comment) => (
          <div key={comment.commentId} className={styles.comment}>
            <div className={styles.commentImageWrapper}>
              <Image
                src={profile_pic ? profile_pic : ""}
                alt="User profile image"
                width={40}
                height={40}
                layout="responsive"
              />
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
        <Typography variant="body2" style={{ color: "lightgrey" }}>
          Inga kommentarer än.
        </Typography>
      )}
    </div>
  );
};

export default DisplayComments;
