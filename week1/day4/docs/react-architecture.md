# React Architecture Guide

## Overview
Dashboard is built as functional components + hooks, with `Dashboard.jsx` as container, `DataContext` for shared fetching/caching, 4 custom hooks for reusable logic, and `ErrorBoundary` for isolation. One-way data flow: Context → Dashboard reducer → presentational components.

## Component Structure
- **Functional components with hooks**: `Dashboard.jsx` uses `useReducer` + `useState` + `useEffect`; no class components except `ErrorBoundary`.
- **Custom hooks for reusable logic**: `useDataFetching` (fetch + loading/error + refetch), `useLocalStorage` (persisted state), `useDebounce` (delayed value), `usePerformance` (navigation/paint metrics).
- **Context for global state**: `DataProvider` exposes `fetchData / subscribe / clearCache / loading / error`; consumed via `useDataContext()` or `useContext(DataContext)`.
- **Error boundaries for error handling**: `ErrorBoundary.jsx` wraps `Dashboard` via `getDerivedStateFromError` + `componentDidCatch`, shows fallback + reload instead of white screen.

## State Management
- **Local state with `useState`**: `selectedMetric`, `viewMode` in `Dashboard`; `data/loading/error` in `useDataFetching`; `debouncedValue`, `metrics` in respective hooks.
- **Complex state with `useReducer`**: `dataReducer` handles `SET_LOADING / SET_ERROR / SET_DATA / UPDATE_FILTERS / RESET`; `dataContextReducer` handles `SET_LOADING / SET_ERROR / CACHE_DATA / CLEAR_CACHE`.
- **Global state with Context API**: `DataContext` caches by `endpoint + JSON(options)` in a `Map`, shares subscribers via a `Set`; avoids prop-drilling fetch logic.
- **Performance optimization with memoization**: `MetricsCard` wrapped in `memo`, `formattedValue` / `changeClass` in `useMemo`, `fetchData / subscribe / clearCache` in `useCallback` to keep deps stable.

## Best Practices
- **Composition over inheritance**: `Dashboard` composes `DashboardHeader / MetricsGrid / ChartContainer / PerformanceMonitor` inside `ErrorBoundary`; `DataProvider` wraps app via `children`.
- **Props validation with PropTypes**: `MetricsCard.propTypes` + `defaultProps` enforce `title/value` types, defaults for `change/trend/icon/onClick`.
- **Performance with `React.memo`**: `MetricsCard` only re-renders on prop change; expensive formatting memoized, not recomputed per render.
- **Code splitting with lazy loading**: pattern ready for `React.lazy(() => import('./ChartContainer'))` + `Suspense` for heavy charts; keeps initial bundle small.

## Data Flow
```
DataProvider.fetchData() → cache check → fetch → CACHE_DATA
  → Dashboard useEffect → dataReducer SET_DATA → MetricsGrid / ChartContainer
subscribe(callback) → data update → dispatch SET_DATA → re-render
Error → SET_ERROR / ErrorBoundary fallback
```
