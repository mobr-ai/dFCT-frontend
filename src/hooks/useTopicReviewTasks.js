import { TOPIC_REVIEW_TASK_TYPE } from "../api/lifecycleTasks";
import { useLifecycleTasks } from "./useLifecycleTasks";

export function useTopicReviewTasks(user, options = {}) {
  return useLifecycleTasks(user, {
    taskType: TOPIC_REVIEW_TASK_TYPE,
    myStatus: "accepted",
    ...options,
  });
}
