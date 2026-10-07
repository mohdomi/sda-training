import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AppBar, Toolbar, Button, Container, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Dashboard, Login, Register } from './pages/Auth';
import OAuthCallback from './pages/OAuthCallback';
import Tasks from './pages/Tasks';
import AIAssistant from './pages/AIAssistant';
import Analytics from './pages/Analytics';

const theme = createTheme();
function Guard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}
function Nav() {
  const { user, logout } = useAuth();
  return (
    <AppBar position="static"><Toolbar>
      <Button color="inherit" component={Link} to="/">Dashboard</Button>
      <Button color="inherit" component={Link} to="/tasks">Tasks</Button>
      <Button color="inherit" component={Link} to="/ai">AI Assistant</Button>
      <Button color="inherit" component={Link} to="/analytics">Analytics</Button>
      <span style={{ flex: 1 }} />
      {user ? <><span>{user.email}</span><Button color="inherit" onClick={logout}>Logout</Button></> : <Button color="inherit" component={Link} to="/login">Login</Button>}
    </Toolbar></AppBar>
  );
}
export default function App() {
  return (
    <ThemeProvider theme={theme}><CssBaseline />
      <AuthProvider><BrowserRouter><Nav />
        <Container sx={{ mt: 3 }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/" element={<Guard><Dashboard /></Guard>} />
            <Route path="/tasks" element={<Guard><Tasks /></Guard>} />
            <Route path="/ai" element={<Guard><AIAssistant /></Guard>} />
            <Route path="/analytics" element={<Guard><Analytics /></Guard>} />
          </Routes>
        </Container>
      </BrowserRouter></AuthProvider>
    </ThemeProvider>
  );
}
