import { REVIEW_TASK_TYPES } from "../api/lifecycleTasks";
import { useLifecycleTasks } from "./useLifecycleTasks";

export function useTopicReviewTasks(user) {
  return useLifecycleTasks(user, {
    taskTypes: REVIEW_TASK_TYPES,
  });
}
