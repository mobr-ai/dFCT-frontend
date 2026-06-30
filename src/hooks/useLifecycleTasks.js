import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthRequest } from "./useAuthRequest";
import {
  acceptLifecycleTask,
  completeLifecycleTask,
  getMyLifecycleTasks,
  getOpenLifecycleTasks,
} from "../api/lifecycleTasks";

export function useLifecycleTasks(user, {
  taskType,
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
      const tasks = await getOpenLifecycleTasks(authRequestRef.current, { taskType });
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
  }, [canLoad, taskType]);

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
      const tasks = await getMyLifecycleTasks(authRequestRef.current, {
        status,
        taskType,
      });
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
  }, [canLoad, myStatus, taskType]);

  const loadCompletedTasks = useCallback(async ({ silent = false } = {}) => {
    if (!canLoad) return [];

    if (!silent) {
      setLoadingCompleted(true);
      setError("");
    }

    try {
      const tasks = await getMyLifecycleTasks(authRequestRef.current, {
        status: "completed",
        taskType,
      });
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
  }, [canLoad, taskType]);

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
