import { useState, useEffect } from "react";
export function usePerformance() {
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    const updateMetrics = () => {
      if ("performance" in window) {
        const navigation = performance.getEntriesByType("navigation")[0];

        const paint = performance.getEntriesByType("paint");

        setMetrics({
          loadTime:
            navigation != null
              ? navigation.loadEventEnd - navigation.loadEventStart
              : 0,
          domContentLoaded:
            navigation != null
              ? navigation.domContentLoadedEventEnd -
                navigation.domContentLoadedEventStart
              : 0,
          firstPaint: paint.find((entry) => entry.name === "first-paint")
            ?.startTime,
          firstContentfulPaint: paint.find(
            (entry) => entry.name === "first-contentful-paint",
          )?.startTime,
        });
      }
    };

    updateMetrics();

    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  return metrics;
}
