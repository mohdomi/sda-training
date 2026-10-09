import { createContext, useContext } from 'react';
import { ThemeMode } from './theme';

// Shared with pages (e.g. Settings) so the toggle writes through one place.
export const ThemeModeCtx = createContext<{ mode: ThemeMode; setMode: (m: ThemeMode) => void }>({
  mode: 'light',
  setMode: () => {},
});
export const useThemeMode = () => useContext(ThemeModeCtx);
