export const TOTAL_LESSON_DAYS = 10;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const LESSON_START_DATE = Date.UTC(2025, 10, 7); // 7 Nov 2025

export const getCurrentLessonDay = () => {
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diff = Math.floor((todayUTC - LESSON_START_DATE) / MS_PER_DAY);
  const normalized = ((diff % TOTAL_LESSON_DAYS) + TOTAL_LESSON_DAYS) % TOTAL_LESSON_DAYS;
  return normalized + 1;
};
