export const TOTAL_LESSON_DAYS = 10;

export const getCurrentLessonDay = () =>
  ((new Date().getDate() - 1) % TOTAL_LESSON_DAYS) + 1;
