// TooltipComponent.jsx
import React from "react";
import styles from "../styles/Tooltip.module.css";

interface TooltipProps {
  children: any;
  text: any;
}

const TooltipComponent = ({ children, text }: TooltipProps) => {
  return (
    <div className={styles.tooltip}>
      {children}
      <span className={styles.tooltipText}>{text}</span>
    </div>
  );
};

export default TooltipComponent;
