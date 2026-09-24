import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import { useApiService } from "./useApiService";
import { getMockData } from "../data/mockData";

export function useRealTimeData(endpoint, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const apiService = useApiService("");
  const wsService = useWebSocket(options.wsUrl);
  const lastUpdateRef = useRef(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const initialData = await apiService.get(endpoint);
        setData(initialData ?? getMockData(endpoint));
        setError(null);
        if (options.enableRealTime && !options.wsUrl) {
          setIsConnected(true);
          lastUpdateRef.current = Date.now();
        }
      } catch (err) {
        setData(getMockData(endpoint));
        setError(null);
        if (options.enableRealTime && !options.wsUrl) {
          setIsConnected(true);
          lastUpdateRef.current = Date.now();
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [endpoint]);

  useEffect(() => {
    if (!options.enableRealTime || !options.wsUrl) {
      return;
    }
    wsService.connect();

    return () => {
      wsService.disconnect();
    };
  }, [options.enableRealTime, options.wsUrl]);

  useEffect(() => {
    if (!options.enableRealTime || !options.wsUrl) return;

    const handleMessage = (message) => {
      const { type, payload } = message;

      if (type === "dataUpdate" && payload.endpoint === endpoint) {
        setData((prevData) => ({
          ...prevData,
          ...payload.data,
        }));
        lastUpdateRef.current = Date.now();
      }
    };

    const unsubscribe = wsService.subscribe("message", handleMessage);

    return unsubscribe;
  }, [endpoint, options.enableRealTime, options.wsUrl]);

  useEffect(() => {
    if (!options.enableRealTime || !options.wsUrl) return;

    const handleConnectionChange = (status) => {
      setIsConnected(status === "connected");
    };

    const unsubscribe = wsService.subscribe(
      "connected",
      handleConnectionChange,
    );
    return unsubscribe;
  }, [options.enableRealTime, options.wsUrl]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const freshData = await apiService.get(endpoint);
      setData(freshData ?? getMockData(endpoint));
      setError(null);
      lastUpdateRef.current = Date.now();
      setIsConnected(true);
    } catch (err) {
      setData(getMockData(endpoint));
      setError(null);
      lastUpdateRef.current = Date.now();
      setIsConnected(true);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  const getLastUpdate = useCallback(() => {
    return lastUpdateRef.current;
  }, []);

  return {
    data,
    loading,
    error,
    isConnected,
    refresh,
    getLastUpdate,
  };
}
