import { WeekData } from "@/types";
import React from "react";

interface TableProps {
  weeksData: WeekData[];
}

const Table: React.FC<TableProps> = ({ weeksData }) => {
  return (
    <table style={{ marginTop: "3rem" }}>
      <thead>
        <b>Antal notionerade FL</b>
        <tr>
          <th>Vecka</th>
          <th>Mattias</th>
          <th>Albin</th>
          <th>David</th>
        </tr>
      </thead>
      <tbody>
        {weeksData.map((weekData) => (
          <tr key={weekData.week}>
            <td>{weekData.week}</td>
            <td>{weekData.totals?.Mattias}</td>
            <td>{weekData.totals?.Albin}</td>
            <td>{weekData.totals?.David}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Table;
