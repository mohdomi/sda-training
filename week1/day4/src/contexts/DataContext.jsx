import { createContext, useContext, useReducer, useCallback, useRef } from "react";
import { getMockData } from "../data/mockData.js";

const DataContext = createContext(null);

const initialState = {
  loading: false,
  error: null,
};
function dataContextReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

function normalizeUrl(endpoint) {
  if (/^https?:\/\//.test(endpoint)) return endpoint;
  if (endpoint.startsWith("/api/")) return endpoint;
  if (endpoint.startsWith("/")) return `/api${endpoint}`;
  return `/api/${endpoint}`;
}

export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(dataContextReducer, initialState);
  const cacheRef = useRef(new Map());
  const subscribersRef = useRef(new Set());

  const fetchData = useCallback(async (endpoint, options = {}) => {
    const cacheKey = `${endpoint}-${JSON.stringify(options)}`;

    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey);
    }

    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const url = normalizeUrl(endpoint);
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      cacheRef.current.set(cacheKey, data);
      dispatch({ type: "SET_LOADING", payload: false });
      subscribersRef.current.forEach((cb) => cb(endpoint, data));
      return data;
    } catch {
      // No backend in Day 4 — fall back to local mock so UI still works
      const fallback = getMockData(endpoint);
      cacheRef.current.set(cacheKey, fallback);
      dispatch({ type: "SET_LOADING", payload: false });
      return fallback;
    }
  }, []);

  const subscribe = useCallback((callback) => {
    subscribersRef.current.add(callback);
    return () => subscribersRef.current.delete(callback);
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const value = {
    fetchData,
    subscribe,
    clearCache,
    loading: state.loading,
    error: state.error,
  };

  return <DataContext.Provider value={value}>
    {children}
  </DataContext.Provider>;
}


export function useDataContext() {

    const context = useContext(DataContext);

    if(!context){
        throw new Error('useDataContext must be used within a DataProvider');
    }

    return context;

}

export {DataContext};