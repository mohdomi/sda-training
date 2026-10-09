import { useEffect, useState } from 'react';
import {
  Box, Grid, ToggleButton, ToggleButtonGroup,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Alert,
  Typography, Paper, useTheme,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';
import { PageHeader, Stat, EmptyState } from '../components/primitives';
import InsightsIcon from '@mui/icons-material/Insights';
import api from '../services/api';

export default function Analytics() {
  const [range, setRange] = useState<'7d' | '30d'>('30d');
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const theme = useTheme();
  const accent = theme.palette.primary.main;
  const muted = theme.palette.text.secondary;
  const grid = theme.palette.divider;
  const SLICES = [accent, '#8A1F1F', '#C27070', '#8A8A8A', '#D4D4D4'];

  useEffect(() => {
    setData(null); setErr(null);
    api.get(`/analytics/overview?range=${range}`)
      .then(({ data }) => setData(data))
      .catch(() => setErr('Could not load analytics. Are you logged in?'));
  }, [range]);

  if (err) return <Alert severity="error">{err}</Alert>;
  if (!data) return <Box sx={{ textAlign: 'center', mt: 6 }}><CircularProgress /></Box>;

  const statusData = Object.entries(data.tasks.by_status).map(([name, value]) => ({ name, value }));
  const prioData = Object.entries(data.tasks.by_priority).map(([name, value]) => ({ name, value }));
  const aiDays = data.ai.per_day.map((d: any) => ({ date: d.date.slice(5), calls: d.count }));
  const empty = data.tasks.total === 0 && data.ai.total === 0;

  const chartTip = {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${grid}`,
    borderRadius: 6,
    fontSize: 12,
  };

  return (
    <Box>
      <PageHeader
        title="Analytics"
        description="Task progress and AI usage for the selected period."
        actions={
          <ToggleButtonGroup size="small" value={range} exclusive onChange={(_, v) => v && setRange(v)}>
            <ToggleButton value="7d">7d</ToggleButton>
            <ToggleButton value="30d">30d</ToggleButton>
          </ToggleButtonGroup>
        }
      />

      {empty ? (
        <EmptyState
          icon={<InsightsIcon fontSize="large" />}
          title="No activity yet"
          hint="Create tasks and chat with the assistant — stats appear here."
        />
      ) : (
        <>
          <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={6} md={3}><Stat label="Total tasks" value={data.tasks.total} /></Grid>
              <Grid item xs={6} md={3}><Stat label="Done" value={`${data.tasks.completion_rate}%`} /></Grid>
              <Grid item xs={6} md={3}><Stat label="AI calls" value={data.ai.total} /></Grid>
              <Grid item xs={6} md={3}><Stat label="Avg AI latency" value={`${data.ai.avg_latency_ms}ms`} /></Grid>
            </Grid>
          </Paper>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Tasks by status</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={statusData} margin={{ left: -20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: muted }} axisLine={{ stroke: grid }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: muted }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTip} />
                    <Bar dataKey="value" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Tasks by priority</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={prioData} dataKey="value" nameKey="name" outerRadius={80} strokeWidth={0} label={{ fontSize: 12 }}>
                      {prioData.map((_: any, i: number) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={chartTip} /><Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>AI calls per day</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={aiDays} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey="date" interval={Math.max(0, Math.floor(aiDays.length / 10))} tick={{ fontSize: 12, fill: muted }} axisLine={{ stroke: grid }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: muted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTip} />
                <Area type="monotone" dataKey="calls" fill={accent} fillOpacity={0.15} stroke={accent} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>AI usage by endpoint</Typography>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Endpoint</TableCell><TableCell align="right">Calls</TableCell><TableCell align="right">Avg latency</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {data.ai.by_endpoint.map((r: any) => (
                  <TableRow key={r.endpoint}>
                    <TableCell component="th" scope="row">{r.endpoint}</TableCell>
                    <TableCell align="right">{r.n}</TableCell>
                    <TableCell align="right">{Math.round(r.avg_latency)}ms</TableCell>
                  </TableRow>
                ))}
                {data.ai.by_endpoint.length === 0 && <TableRow><TableCell colSpan={3}>No AI usage yet — chat with the assistant first.</TableCell></TableRow>}
              </TableBody>
            </Table>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
              {data.ai.seeded > 0
                ? `${data.ai.seeded} of ${data.ai.total} AI rows are seeded demo data (same shape as live rows); the rest is your real usage.`
                : `All ${data.ai.total} AI rows are your real usage. Mocked (quota-fallback) share: ${data.ai.mocked_ratio}%.`}
            </Typography>
          </Paper>
        </>
      )}
    </Box>
  );
}
