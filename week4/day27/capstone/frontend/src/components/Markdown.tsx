import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Typography, Link, Divider, Box, useTheme } from '@mui/material';

// Renders model-generated markdown with theme-aware styling.
// Safe by default: no rehype-raw, so raw HTML in model output stays inert
// text (react-markdown builds a virtual DOM, never innerHTML).
const MONO =
  '"SF Mono", ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace';

export function MarkdownText({ text }: { text: string }) {
  const theme = useTheme();
  const border = theme.palette.divider;
  const surface =
    theme.palette.mode === 'light' ? '#F5F1EF' : '#1E1E20';
  return (
    <Box
      sx={{
        fontSize: '0.9375rem',
        lineHeight: 1.65,
        color: 'text.primary',
        '& > *:first-of-type': { mt: 0 },
        '& > *:last-child': { mb: 0 },
        '& p': { my: 1 },
        '& ul, & ol': { my: 1, pl: 3 },
        '& li': { my: 0.4 },
        '& li::marker': { color: 'text.secondary' },
        '& blockquote': {
          m: 0, my: 1.5, pl: 2,
          borderLeft: `3px solid ${border}`,
          color: 'text.secondary',
        },
        '& pre': {
          fontFamily: MONO, fontSize: '0.8125rem', lineHeight: 1.6,
          backgroundColor: surface, border: `1px solid ${border}`,
          borderRadius: 1.5, padding: 1.5, overflowX: 'auto', my: 1.5,
        },
        '& code': { fontFamily: MONO, fontSize: '0.85em' },
        '& p code, & li code': {
          backgroundColor: surface, border: `1px solid ${border}`,
          borderRadius: 1, padding: '0.1em 0.35em',
        },
        '& table': { borderCollapse: 'collapse', width: '100%', my: 1.5, fontSize: '0.875rem' },
        '& th, & td': { border: `1px solid ${border}`, padding: '6px 10px', textAlign: 'left' },
        '& th': { fontWeight: 650 },
        '& hr': { border: 'none', borderTop: `1px solid ${border}`, my: 2 },
        '& input[type="checkbox"]': { marginRight: 6, accentColor: theme.palette.primary.main },
      }}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>{children}</Typography>,
          h2: ({ children }) => <Typography variant="h5" sx={{ mt: 2, mb: 1, fontSize: '1.15rem' }}>{children}</Typography>,
          h3: ({ children }) => <Typography variant="h6" sx={{ mt: 1.5, mb: 0.75 }}>{children}</Typography>,
          h4: ({ children }) => <Typography variant="subtitle1" sx={{ mt: 1.5, mb: 0.5 }}>{children}</Typography>,
          a: ({ children, href }) => <Link href={href} target="_blank" rel="noopener noreferrer">{children}</Link>,
          hr: () => <Divider sx={{ my: 2 }} />,
          strong: ({ children }) => <strong>{children}</strong>,
        }}
      >
        {text}
      </Markdown>
    </Box>
  );
}
