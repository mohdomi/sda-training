import { useState, useEffect, useCallback } from "react";

export function useDataFetching(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const optionsKey = JSON.stringify(options);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const parsedOptions = JSON.parse(optionsKey);
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...parsedOptions.headers,
        },
        ...parsedOptions,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status : ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url, optionsKey]);

  useEffect(() => {
    // Fetch-on-mount is intentional here (Day 4 spec: useDataFetching auto-loads)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

