import { createTheme } from '@mui/material';

// Notion/Obsidian-inspired tokens. Light + dark stay in lockstep so the
// existing theme toggle keeps working with identical structure.
export type ThemeMode = 'light' | 'dark';

const FONT_STACK =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO_STACK =
  '"SF Mono", ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace';

const RADIUS = 8;

export function buildTheme(mode: ThemeMode) {
  const light = mode === 'light';
  return createTheme({
    palette: {
      mode,
      background: {
        default: light ? '#FAF9F6' : '#191918',
        paper: light ? '#FFFFFF' : '#20201F',
      },
      text: {
        primary: light ? '#252525' : '#E8E6E1',
        secondary: light ? '#737373' : '#A3A099',
      },
      divider: light ? '#E7E5E0' : '#2E2D2B',
      primary: {
        main: light ? '#4B54A6' : '#8B93E8',
        contrastText: '#FFFFFF',
      },
      success: { main: light ? '#3D9A50' : '#6FCF97' },
      warning: { main: light ? '#B7791F' : '#E5B567' },
      error: { main: light ? '#C0453E' : '#E8837A' },
    },
    typography: {
      fontFamily: FONT_STACK,
      h4: { fontSize: '1.5rem', fontWeight: 650, letterSpacing: '-0.01em' },
      h5: { fontSize: '1.25rem', fontWeight: 650, letterSpacing: '-0.01em' },
      h6: { fontSize: '1rem', fontWeight: 650 },
      subtitle1: { fontSize: '0.95rem', fontWeight: 600 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.55 },
      caption: { fontSize: '0.75rem', lineHeight: 1.5 },
      button: { textTransform: 'none', fontWeight: 550 },
    },
    shape: { borderRadius: RADIUS },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { fontFamily: FONT_STACK, fontFeatureSettings: '"cv11", "ss01"' },
          code: { fontFamily: MONO_STACK },
          '*:focus-visible': { outline: '2px solid #4B54A6', outlineOffset: 2 },
          '@media (prefers-reduced-motion: reduce)': {
            '*': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 6, boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
          outlined: {
            borderColor: light ? '#E7E5E0' : '#2E2D2B',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { boxShadow: 'none', backgroundImage: 'none' },
          outlined: { borderColor: light ? '#E7E5E0' : '#2E2D2B' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS,
            boxShadow: 'none',
            border: `1px solid ${light ? '#E7E5E0' : '#2E2D2B'}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined', size: 'small' },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            backgroundColor: light ? '#FFFFFF' : '#20201F',
          },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: light ? '#E7E5E0' : '#2E2D2B' } },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 6, fontWeight: 500 } },
      },
      MuiTab: {
        styleOverrides: { root: { textTransform: 'none', fontWeight: 550 } },
      },
      MuiListItem: {
        styleOverrides: { root: { borderRadius: 6 } },
      },
    },
  });
}
