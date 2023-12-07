export const setLectureBgColor = (lectureDateStr: string) => {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const lectureDate = new Date(lectureDateStr);
  lectureDate.setHours(0, 0, 0, 0);

  if (lectureDate.getTime() === currentDate.getTime()) {
    return "#453501"; // Yellow background for today's lectures
  } else if (lectureDate < currentDate) {
    return "#0d4501"; // Green background for past lectures
  }
  return "black"; // Black background for future lectures
};
