import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const TOTAL_DAILY_TASKS = 2;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type DailyTaskStatus = {
  vocabCompleted: boolean;
  scenarioCompleted: boolean;
};

const getTodayUTCDateString = () => {
  const now = new Date();
  return now.toISOString().split("T")[0];
};

const daysBetween = (start: string, end: string) => {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  return Math.floor((endMs - startMs) / MS_PER_DAY);
};

export const fetchTodayTaskStatus = async (userId: string): Promise<DailyTaskStatus> => {
  const today = getTodayUTCDateString();
  const { data } = await supabase
    .from("user_daily_tasks")
    .select("vocab_completed, scenario_completed")
    .eq("user_id", userId)
    .eq("task_date", today)
    .maybeSingle();

  return {
    vocabCompleted: data?.vocab_completed ?? false,
    scenarioCompleted: data?.scenario_completed ?? false,
  };
};

const updateStreakIfNeeded = async (userId: string, completedDate: string) => {
  const { data: progress } = await supabase
    .from("user_progress")
    .select("streak, last_activity_date")
    .eq("user_id", userId)
    .single();

  if (!progress) return;

  const lastDate = progress.last_activity_date ?? null;
  if (lastDate === completedDate) {
    return;
  }

  let newStreak = 1;
  if (lastDate) {
    const gap = daysBetween(lastDate, completedDate);
    if (gap === 1) {
      newStreak = progress.streak + 1;
    } else if (gap <= 0) {
      newStreak = progress.streak;
    } else {
      newStreak = 1;
    }
  }

  await supabase
    .from("user_progress")
    .update({ streak: newStreak, last_activity_date: completedDate })
    .eq("user_id", userId);
};

export const markTaskCompleted = async (
  userId: string,
  task: "vocab" | "scenario",
): Promise<DailyTaskStatus> => {
  const today = getTodayUTCDateString();
  type TaskColumn = "vocab_completed" | "scenario_completed";
  const column: TaskColumn = task === "vocab" ? "vocab_completed" : "scenario_completed";

  const { data: existing } = await supabase
    .from("user_daily_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("task_date", today)
    .maybeSingle();

  let record: Tables<"user_daily_tasks"> | null = existing;

  if (!record) {
    const insertPayload = {
      user_id: userId,
      task_date: today,
      vocab_completed: task === "vocab",
      scenario_completed: task === "scenario",
    };
    const { data: inserted } = await supabase
      .from("user_daily_tasks")
      .insert(insertPayload)
      .select()
      .single();
    record = inserted;
  } else if ((task === "vocab" ? !record.vocab_completed : !record.scenario_completed)) {
    const { data: updated } = await supabase
      .from("user_daily_tasks")
      .update({ [column]: true })
      .eq("id", record.id)
      .select()
      .single();
    record = updated;
  }

  const finalRecord = record ?? { vocab_completed: false, scenario_completed: false };

  if (finalRecord.vocab_completed && finalRecord.scenario_completed) {
    await updateStreakIfNeeded(userId, today);
  }

  return {
    vocabCompleted: finalRecord.vocab_completed,
    scenarioCompleted: finalRecord.scenario_completed,
  };
};
