# JavaScript Performance Guide

## Optimization Techniques
- **requestAnimationFrame for animations**: Chart.js's own animation loop already uses rAF internally (`animation.duration` / `easing` config) — avoid layering `setInterval`-driven animation on top of it.
- **Virtual scrolling for large lists**: not needed at current dashboard scale (4 charts, capped metric list), but worth adopting if the metrics panel or a future data table grows past a few hundred rows.
- **Web Workers for heavy computations**: the current chart data prep is light enough to run on the main thread; flag this if `generateSummary()` ever has to reduce over a large stored-metrics array synchronously on every event.
- **Optimize DOM manipulation**: metric rows are appended one at a time via `appendChild` rather than re-rendering the whole panel — batch this with a `DocumentFragment` if the update rate increases.

## Memory Management
- **Avoid memory leaks**: `subscribe()` on both `DataManager` and `PerformanceMonitor` returns an unsubscribe function — call it when a component using it is torn down, otherwise listeners accumulate in the `Set` for the life of the page.
- **WeakMap / WeakSet**: current `cache` and `charts` use regular `Map`, which is correct here since entries are keyed by strings, not objects that should be garbage-collected — WeakMap only helps when the key itself is a DOM node or object you want auto-cleaned.
- **Clean up event listeners**: the `resize` listener on `window` is registered once at init and never removed — acceptable for a single-page dashboard, but note it if `ChartManager` is ever destroyed/recreated within a SPA route change.
- **Monitor memory usage**: `PerformanceMonitor.observeMemory()` polls `performance.memory` every 5s and records heap used/total/limit — watch `memory-used` trending upward across a session as the leak signal.

## Core Web Vitals Tracked
| Metric | What it measures | Target |
|---|---|---|
| LCP (Largest Contentful Paint) | Time to render the largest visible element | < 2.5s |
| FID (First Input Delay) | Delay between first interaction and browser response | as low as possible |
| CLS (Cumulative Layout Shift) | Unexpected layout movement | < 0.1 |

All three are captured via `PerformanceObserver` in `observePerformance()` and pushed through the same `recordMetric()` → `notifyObservers()` pipeline as the memory stats, so they show up in the live panel and in `generateReport()`.

## Storage Note
Metrics are persisted to `localStorage` capped at the last 100 entries (`storeMetric()`). This is fine for a demo dashboard but is per-browser, per-device state — don't rely on it as a source of truth if metrics ever need to be compared across sessions or machines.