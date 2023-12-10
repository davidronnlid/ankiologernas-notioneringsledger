import React from "react";
import styles from "../styles/Comment.module.css";
import { IconButton, Typography } from "@material-ui/core";
import { Comment } from "types/lecture";
import DeleteIcon from "@material-ui/icons/Delete";
import { RootState } from "store/types";
import { useDispatch, useSelector } from "react-redux";
import Image from "next/image";
import { deleteComment } from "store/slices/commentsReducer";
import { getProfilePicUrl } from "utils/profilePicMapper";
import TooltipComponent from "./Tooltip";

interface DisplayCommentsProps {
  lectureId: string;
  comments: Comment[];
}

const DisplayComments: React.FC<DisplayCommentsProps> = ({
  lectureId,
  comments,
}) => {
  const dispatch = useDispatch();

  const fullName = useSelector(
    (state: RootState) => state.auth.user?.full_name
  );

  const reduxComments = useSelector(
    (state: RootState) => state.comments.comments[lectureId] || []
  );

  const handleDeleteComment = async (lectureId: string, commentId: string) => {
    // API call to delete the comment
    console.log("lectureId", lectureId, "commentId", commentId);
    try {
      const apiUrl =
        process.env.NODE_ENV === "development"
          ? process.env.NEXT_PUBLIC_API_URL
          : "/.netlify";

      const response = await fetch(
        `${apiUrl}/functions/CRUDFLData?lectureId=${lectureId}&commentId=${commentId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ lectureId, commentId }),
        }
      );

      if (response.ok) {
        console.log("Comment deleted successfully");

        // Dispatch the deleteComment action
        dispatch(deleteComment({ lectureId, commentId }));
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };
  return (
    <div className={styles.commentsContainer}>
      {comments.length > 0 || reduxComments.length > 0 ? (
        [...comments, ...reduxComments].map((comment: Comment) => {
          const profilePicUrl = getProfilePicUrl(comment.fullName);

          const commentDate = new Date(comment.dateAdded);

          const formattedDate = comment.dateAdded
            ? commentDate.toLocaleDateString("en-US", {
                year: "2-digit",
                month: "2-digit",
                day: "2-digit",
              })
            : "Inget datum";

          const formattedTime = comment.dateAdded
            ? commentDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false, // change to false for 24-hour format
              })
            : "";

          return (
            <div key={comment.commentId} className={styles.comment}>
              <TooltipComponent
                text={
                  comment.fullName === "albin"
                    ? "Albin Lindberg"
                    : comment.fullName
                }
              >
                <div className={styles.commentImageWrapper}>
                  <Image
                    src={profilePicUrl || ""}
                    alt={`${comment.fullName}'s profile image`}
                    width={40}
                    height={40}
                    layout="fixed"
                  />
                </div>
              </TooltipComponent>

              <Typography variant="body2" className={styles.commentText}>
                {comment.comment}
              </Typography>

              {/* Display the date */}
              <Typography variant="body2" className={styles.commentDate}>
                {formattedTime} {formattedDate}
              </Typography>

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
          );
        })
      ) : (
        <Typography variant="body2" className={styles.noCommentsText}>
          Inga kommentarer än.
        </Typography>
      )}
    </div>
  );
};

export default DisplayComments;
