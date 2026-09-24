import { useRef, useCallback, useEffect, useState } from "react";
import ApiService from "../services/ApiService";

export const useApiService = (baseUrl, options = {}) => {
  const serviceRef = useRef(null);

  if (!serviceRef.current) {
    serviceRef.current = new ApiService(baseUrl, options);
  }

  const service = serviceRef.current;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const request = useCallback(
    async (endpoint, config = {}) => {
      setLoading(true);
      setError(null);

      try {
        const data = await service.request(endpoint, config);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        setError(error);

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [service],
  );

  const get = useCallback(
    async (endpoint, config = {}) => {
      return request(endpoint, { ...config, method: "GET" });
    },
    [request],
  );

  const post = useCallback(
    async (endpoint, data, config = {}) => {
      return request(endpoint, {
        ...config,
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    [request],
  );

  useEffect(() => {
    return () => {
      service.clearCache();
    };
  }, [service]);

  return { service, loading, error, get, post };
};
