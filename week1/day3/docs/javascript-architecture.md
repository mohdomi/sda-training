# JavaScript Architecture Guide

## Overview
The dashboard is split into three independent ES6 modules — `DataManager`, `ChartManager`, and `PerformanceMonitor` — composed by a single `DashboardApp` entry point. Each module owns one concern and talks to the others only through explicit method calls or the subscribe/notify pattern below.

## Module System
- **ES6 modules**: every file uses `import`/`export`, no globals leaking between files.
- **Separation of concerns**: `DataManager` fetches/caches data, `ChartManager` renders it, `PerformanceMonitor` observes runtime metrics. None of them reach into another's internals.
- **Dependency injection**: `ChartManager` receives its `DataManager` instance through the constructor instead of creating its own, which keeps it testable and swappable.
- **Lazy loading**: Chart.js itself is only pulled in at runtime via `loadChartLibrary()`, not bundled up front — avoids paying for it on pages that don't render charts.

## Design Patterns

### Observer pattern
`DataManager.subscribe()` and `PerformanceMonitor.subscribe()` both return an unsubscribe function and store listeners in a `Set`. Any module can react to new data or new metrics without polling — `ChartManager` re-renders a chart the moment its data updates.

### Module pattern
Each class encapsulates its own state (`cache`, `charts`, `metrics` maps) as instance fields — no shared mutable state, no reliance on closures over module-level variables.

### Factory-style chart creation
`createLineChart`, `createBarChart`, `createDoughnutChart`, `createMixedChart` all follow the same shape: take a canvas id and data, return a configured `Chart` instance, store it in `this.charts`. Adding a new chart type means adding one more method with that same contract.

### Strategy (implicit)
`updateCharts()` switches on the endpoint string to decide which chart to refresh — a light strategy dispatch rather than a full class-per-strategy setup, appropriate given there are only three data sources.

## Performance Optimization
- **Debouncing**: window resize triggers a debounced `chart.resize()` call (250ms) instead of resizing on every pixel of drag.
- **Caching**: `DataManager` keys its cache by `endpoint + serialized options`, so repeated fetches with identical params never hit the network twice.
- **Code splitting**: modules are only imported where used; `app.js` is the sole place that pulls all three together.
- **Bounded DOM growth**: the performance panel caps itself at the last 10 visible metric rows to avoid unbounded DOM growth during a long session.

## Data Flow
```
DataManager.fetchData()
  → cache check → fetch → notifySubscribers()
      → ChartManager.updateCharts() → Chart.js re-render
PerformanceMonitor.recordMetric()
  → notifyObservers() → DashboardApp.updatePerformanceDisplay()
```