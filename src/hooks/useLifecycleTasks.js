import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthRequest } from "./useAuthRequest";
import {
  TOPIC_REVIEW_TASK_TYPE,
  acceptLifecycleTask,
  completeLifecycleTask,
  getMyLifecycleTasks,
  getOpenLifecycleTasks,
} from "../api/lifecycleTasks";

function uniqueTasksById(tasks) {
  const seen = new Set();

  return tasks.filter((task) => {
    const taskId = task?.taskId ?? task?.task_id ?? task?.id;
    const key = String(taskId || "");

    if (!key || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export function useLifecycleTasks(user, {
  taskType,
  taskTypes,
  myStatus = "accepted",
} = {}) {
  const { authRequest } = useAuthRequest(user);
  const authRequestRef = useRef(authRequest);

  const [openTasks, setOpenTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [loadingMine, setLoadingMine] = useState(false);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [actionTaskId, setActionTaskId] = useState(null);
  const [error, setError] = useState("");

  const canLoad = Boolean(user?.access_token);
  const taskTypeList = useMemo(() => {
    const rawTypes = Array.isArray(taskTypes) && taskTypes.length
      ? taskTypes
      : [taskType || TOPIC_REVIEW_TASK_TYPE];

    return rawTypes.filter(Boolean);
  }, [taskType, taskTypes]);

  const taskTypeSignature = taskTypeList.join("|");

  useEffect(() => {
    authRequestRef.current = authRequest;
  }, [authRequest]);

  const loadOpenTasks = useCallback(async ({ silent = false } = {}) => {
    if (!canLoad) return [];

    if (!silent) {
      setLoadingOpen(true);
      setError("");
    }

    try {
      const taskLists = await Promise.all(
        taskTypeList.map((nextTaskType) =>
          getOpenLifecycleTasks(authRequestRef.current, { taskType: nextTaskType })
        )
      );
      const tasks = uniqueTasksById(taskLists.flat());
      setOpenTasks(tasks);
      return tasks;
    } catch (err) {
      if (!silent) {
        setError(err?.message || "Failed to load lifecycle tasks.");
      }
      throw err;
    } finally {
      if (!silent) {
        setLoadingOpen(false);
      }
    }
  }, [canLoad, taskTypeList]);

  const loadMyTasks = useCallback(async (
    status = myStatus,
    { silent = false } = {}
  ) => {
    if (!canLoad) return [];

    if (!silent) {
      setLoadingMine(true);
      setError("");
    }

    try {
      const taskLists = await Promise.all(
        taskTypeList.map((nextTaskType) =>
          getMyLifecycleTasks(authRequestRef.current, {
            status,
            taskType: nextTaskType,
          })
        )
      );
      const tasks = uniqueTasksById(taskLists.flat());
      setMyTasks(tasks);
      return tasks;
    } catch (err) {
      if (!silent) {
        setError(err?.message || "Failed to load your lifecycle tasks.");
      }
      throw err;
    } finally {
      if (!silent) {
        setLoadingMine(false);
      }
    }
  }, [canLoad, myStatus, taskTypeList]);

  const loadCompletedTasks = useCallback(async ({ silent = false } = {}) => {
    if (!canLoad) return [];

    if (!silent) {
      setLoadingCompleted(true);
      setError("");
    }

    try {
      const taskLists = await Promise.all(
        taskTypeList.map((nextTaskType) =>
          getMyLifecycleTasks(authRequestRef.current, {
            status: "completed",
            taskType: nextTaskType,
          })
        )
      );
      const tasks = uniqueTasksById(taskLists.flat());
      setCompletedTasks(tasks);
      return tasks;
    } catch (err) {
      if (!silent) {
        setError(err?.message || "Failed to load completed lifecycle tasks.");
      }
      throw err;
    } finally {
      if (!silent) {
        setLoadingCompleted(false);
      }
    }
  }, [canLoad, taskTypeList]);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    const [nextOpen, nextMine, nextCompleted] = await Promise.all([
      loadOpenTasks({ silent }),
      loadMyTasks(myStatus, { silent }),
      loadCompletedTasks({ silent }),
    ]);

    return {
      openTasks: nextOpen,
      myTasks: nextMine,
      completedTasks: nextCompleted,
    };
  }, [loadCompletedTasks, loadMyTasks, loadOpenTasks, myStatus]);

  const acceptTask = useCallback(async (taskId) => {
    setActionTaskId(taskId);
    setError("");

    try {
      const result = await acceptLifecycleTask(authRequestRef.current, taskId);
      await refresh();
      return result;
    } catch (err) {
      setError(err?.message || "Failed to accept lifecycle task.");
      throw err;
    } finally {
      setActionTaskId(null);
    }
  }, [refresh]);

  const completeTask = useCallback(async (taskId, payload) => {
    setActionTaskId(taskId);
    setError("");

    try {
      const result = await completeLifecycleTask(
        authRequestRef.current,
        taskId,
        payload
      );
      await refresh();
      return result;
    } catch (err) {
      setError(err?.message || "Failed to complete lifecycle task.");
      throw err;
    } finally {
      setActionTaskId(null);
    }
  }, [refresh]);

  return useMemo(() => ({
    openTasks,
    myTasks,
    completedTasks,
    taskTypes: taskTypeList,
    loadingOpen,
    loadingMine,
    loadingCompleted,
    loading: loadingOpen || loadingMine || loadingCompleted,
    actionTaskId,
    error,
    loadOpenTasks,
    loadMyTasks,
    loadCompletedTasks,
    refresh,
    acceptTask,
    completeTask,
  }), [
    openTasks,
    myTasks,
    completedTasks,
    taskTypes: taskTypeList,
    loadingOpen,
    loadingMine,
    loadingCompleted,
    actionTaskId,
    error,
    loadOpenTasks,
    loadMyTasks,
    loadCompletedTasks,
    refresh,
    acceptTask,
    completeTask,
  ]);
}
