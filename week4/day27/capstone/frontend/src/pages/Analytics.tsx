import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, ToggleButton, ToggleButtonGroup,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Alert,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';
import api from '../services/api';

const COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#a855f7', '#ef4444'];

export default function Analytics() {
  const [range, setRange] = useState<'7d' | '30d'>('30d');
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

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

  const kpi = (label: string, value: string | number) => (
    <Grid item xs={6} md={3} key={label}>
      <Card><CardContent>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h4">{value}</Typography>
      </CardContent></Card>
    </Grid>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Analytics</Typography>
        <ToggleButtonGroup size="small" value={range} exclusive onChange={(_, v) => v && setRange(v)}>
          <ToggleButton value="7d">7d</ToggleButton>
          <ToggleButton value="30d">30d</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {kpi('Total tasks', data.tasks.total)}
        {kpi('Done %', `${data.tasks.completion_rate}%`)}
        {kpi('AI calls', data.ai.total)}
        {kpi('Avg AI latency', `${data.ai.avg_latency_ms}ms`)}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Tasks by status</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusData}>
                <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Tasks by priority</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={prioData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {prioData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1">AI calls per day</Typography>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={aiDays}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" interval={Math.max(0, Math.floor(aiDays.length / 10))} />
            <YAxis allowDecimals={false} /><Tooltip />
            <Area type="monotone" dataKey="calls" fill="#a855f7" stroke="#a855f7" />
          </AreaChart>
        </ResponsiveContainer>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1">AI usage by endpoint</Typography>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Endpoint</TableCell><TableCell>Calls</TableCell><TableCell>Avg latency</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {data.ai.by_endpoint.map((r: any) => (
              <TableRow key={r.endpoint}>
                <TableCell>{r.endpoint}</TableCell><TableCell>{r.n}</TableCell><TableCell>{Math.round(r.avg_latency)}ms</TableCell>
              </TableRow>
            ))}
            {data.ai.by_endpoint.length === 0 && <TableRow><TableCell colSpan={3}>No AI usage yet — chat with the assistant first.</TableCell></TableRow>}
          </TableBody>
        </Table>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {data.ai.seeded > 0
            ? `${data.ai.seeded} of ${data.ai.total} AI rows are seeded demo data (same shape as live rows); the rest is your real usage.`
            : `All ${data.ai.total} AI rows are your real usage. Mocked (quota-fallback) share: ${data.ai.mocked_ratio}%.`}
        </Typography>
      </Paper>
    </Box>
  );
}
