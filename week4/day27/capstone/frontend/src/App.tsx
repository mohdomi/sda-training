import React, { useState } from 'react';
import {
  BrowserRouter, Routes, Route, Link, Navigate, useLocation,
} from 'react-router-dom';
import {
  AppBar, Toolbar, Button, CssBaseline, ThemeProvider,
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, IconButton, Divider, useMediaQuery, useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChecklistIcon from '@mui/icons-material/Checklist';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import InsightsIcon from '@mui/icons-material/Insights';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Dashboard, Login, Register } from './pages/Auth';
import OAuthCallback from './pages/OAuthCallback';
import Tasks from './pages/Tasks';
import AIAssistant from './pages/AIAssistant';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import { buildTheme, ThemeMode } from './theme';
import { ThemeModeCtx } from './themeMode';

const DRAWER_WIDTH = 240;

const NAV = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon fontSize="small" /> },
  { to: '/tasks', label: 'Tasks', icon: <ChecklistIcon fontSize="small" /> },
  { to: '/ai', label: 'AI Assistant', icon: <SmartToyIcon fontSize="small" /> },
  { to: '/analytics', label: 'Analytics', icon: <InsightsIcon fontSize="small" /> },
  { to: '/settings', label: 'Settings', icon: <SettingsIcon fontSize="small" /> },
];

function Guard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
          Task Assistant
        </Typography>
        <Typography variant="caption" color="text.secondary">
          AI-powered workspace
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1.5, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {NAV.map((item) => {
          const active = item.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(item.to);
          return (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              selected={active}
              onClick={onNavigate}
              sx={{
                borderRadius: 1.5,
                '&.Mui-selected': { bgcolor: 'action.selected', fontWeight: 600 },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: active ? 600 : 450 }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ flex: 1 }} />
      <Divider />
      <Box sx={{ px: 2.5, py: 2 }}>
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>{user.email}</Typography>
              <Typography variant="caption" color="text.secondary">{user.role}</Typography>
            </Box>
            <IconButton size="small" onClick={() => logout()} aria-label="Log out">
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <Button component={Link} to="/login" variant="outlined" size="small" fullWidth onClick={onNavigate}>
            Log in
          </Button>
        )}
      </Box>
    </Box>
  );
}

function Shell() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {desktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: 1, borderColor: 'divider' },
          }}
        >
          <SidebarBody />
        </Drawer>
      ) : (
        <>
          <AppBar position="fixed" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Toolbar variant="dense">
              <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
                <MenuIcon />
              </IconButton>
              <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>Task Assistant</Typography>
            </Toolbar>
          </AppBar>
          <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}>
            <Box sx={{ width: DRAWER_WIDTH }}>
              <SidebarBody onNavigate={() => setMobileOpen(false)} />
            </Box>
          </Drawer>
        </>
      )}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 2, md: 4 },
          pt: desktop ? undefined : 8,
          maxWidth: 1080,
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/" element={<Guard><Dashboard /></Guard>} />
          <Route path="/tasks" element={<Guard><Tasks /></Guard>} />
          <Route path="/ai" element={<Guard><AIAssistant /></Guard>} />
          <Route path="/analytics" element={<Guard><Analytics /></Guard>} />
          <Route path="/settings" element={<Guard><Settings /></Guard>} />
        </Routes>
      </Box>
    </Box>
  );
}

export default function App() {
  const [mode, setMode] = useState<ThemeMode>(() => (localStorage.getItem('theme') as ThemeMode) || 'light');
  const theme = React.useMemo(() => buildTheme(mode), [mode]);
  const applyMode = (m: ThemeMode) => { setMode(m); localStorage.setItem('theme', m); };
  return (
    <ThemeProvider theme={theme}><CssBaseline />
      <ThemeModeCtx.Provider value={{ mode, setMode: applyMode }}>
        <AuthProvider>
          <BrowserRouter>
            <Shell />
          </BrowserRouter>
        </AuthProvider>
      </ThemeModeCtx.Provider>
    </ThemeProvider>
  );
}
