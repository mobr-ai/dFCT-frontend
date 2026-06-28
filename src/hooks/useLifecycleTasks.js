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
  const [loadingOpen, setLoadingOpen] = useState(false);
  const [loadingMine, setLoadingMine] = useState(false);
  const [actionTaskId, setActionTaskId] = useState(null);
  const [error, setError] = useState("");

  const canLoad = Boolean(user?.access_token);

  useEffect(() => {
    authRequestRef.current = authRequest;
  }, [authRequest]);

  const loadOpenTasks = useCallback(async () => {
    if (!canLoad) return [];

    setLoadingOpen(true);
    setError("");

    try {
      const tasks = await getOpenLifecycleTasks(authRequestRef.current, { taskType });
      setOpenTasks(tasks);
      return tasks;
    } catch (err) {
      setError(err?.message || "Failed to load lifecycle tasks.");
      throw err;
    } finally {
      setLoadingOpen(false);
    }
  }, [canLoad, taskType]);

  const loadMyTasks = useCallback(async (status = myStatus) => {
    if (!canLoad) return [];

    setLoadingMine(true);
    setError("");

    try {
      const tasks = await getMyLifecycleTasks(authRequestRef.current, {
        status,
        taskType,
      });
      setMyTasks(tasks);
      return tasks;
    } catch (err) {
      setError(err?.message || "Failed to load your lifecycle tasks.");
      throw err;
    } finally {
      setLoadingMine(false);
    }
  }, [canLoad, myStatus, taskType]);

  const refresh = useCallback(async () => {
    const [nextOpen, nextMine] = await Promise.all([
      loadOpenTasks(),
      loadMyTasks(myStatus),
    ]);

    return { openTasks: nextOpen, myTasks: nextMine };
  }, [loadMyTasks, loadOpenTasks, myStatus]);

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
    loadingOpen,
    loadingMine,
    loading: loadingOpen || loadingMine,
    actionTaskId,
    error,
    loadOpenTasks,
    loadMyTasks,
    refresh,
    acceptTask,
    completeTask,
  }), [
    openTasks,
    myTasks,
    loadingOpen,
    loadingMine,
    actionTaskId,
    error,
    loadOpenTasks,
    loadMyTasks,
    refresh,
    acceptTask,
    completeTask,
  ]);
}
