import React from 'react';
import { Box, Typography } from '@mui/material';

// Consistent page heading: title + optional description + right-aligned actions.
export function PageHeader({ title, description, actions }: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 3 }}>
      <Box>
        <Typography variant="h4" component="h1">{title}</Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>{actions}</Box>}
    </Box>
  );
}

// Quiet empty state: icon + message, no decoration.
export function EmptyState({ icon, title, hint }: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
      {icon && <Box sx={{ mb: 1, opacity: 0.6 }}>{icon}</Box>}
      <Typography variant="subtitle1" color="text.primary">{title}</Typography>
      {hint && <Typography variant="body2" sx={{ mt: 0.5 }}>{hint}</Typography>}
    </Box>
  );
}

// Plain KPI stat (no card chrome — used inside grouped surfaces).
export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h4" sx={{ mt: 0.5 }}>{value}</Typography>
    </Box>
  );
}
