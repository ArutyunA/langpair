export const TOTAL_DAILY_TASKS = 2;
const STORAGE_KEY = "langpair-task-progress-v1";

export type DailyTaskStatus = {
  vocabCompleted: boolean;
  scenarioCompleted: boolean;
};

type TaskStore = {
  dailyTasks: Record<string, DailyTaskStatus>;
};

const getTodayUTCDateString = () => {
  const now = new Date();
  return now.toISOString().split("T")[0];
};

const readStore = (): TaskStore => {
  if (typeof window === "undefined" || !window.localStorage) {
    return { dailyTasks: {} };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { dailyTasks: {} };
    }

    const parsed = JSON.parse(raw) as TaskStore;
    return {
      dailyTasks: parsed.dailyTasks ?? {},
    };
  } catch (_error) {
    return { dailyTasks: {} };
  }
};

const writeStore = (store: TaskStore) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const fetchTodayTaskStatus = async (): Promise<DailyTaskStatus> => {
  const today = getTodayUTCDateString();
  const store = readStore();
  return store.dailyTasks[today] ?? { vocabCompleted: false, scenarioCompleted: false };
};

export const getCurrentStreak = () => {
  const store = readStore();
  const completedSet = new Set(
    Object.entries(store.dailyTasks)
      .filter(([, status]) => status.vocabCompleted && status.scenarioCompleted)
      .map(([date]) => date),
  );

  if (completedSet.size === 0) {
    return 0;
  }

  let streak = 0;
  let cursor = getTodayUTCDateString();

  while (completedSet.has(cursor)) {
    streak += 1;
    const previous = new Date(`${cursor}T00:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);
    cursor = previous.toISOString().slice(0, 10);
  }

  return streak;
};

export const markTaskCompleted = async (
  task: "vocab" | "scenario",
): Promise<DailyTaskStatus> => {
  const today = getTodayUTCDateString();
  const store = readStore();
  const current = store.dailyTasks[today] ?? {
    vocabCompleted: false,
    scenarioCompleted: false,
  };

  const updated = {
    ...current,
    vocabCompleted: task === "vocab" ? true : current.vocabCompleted,
    scenarioCompleted: task === "scenario" ? true : current.scenarioCompleted,
  };

  store.dailyTasks[today] = updated;
  writeStore(store);

  return updated;
};
