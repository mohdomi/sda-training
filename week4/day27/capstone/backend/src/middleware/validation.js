import { z } from 'zod';

// Rejects malformed bodies with 400 + details. Shape checks only —
// semantic rules (password strength, ownership) stay in route/middleware code.
// Unknown keys are stripped (zod objects strip by default); defaults applied.
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: result.error.issues.map((i) => {
          const at = i.path.length ? `${i.path.join('.')}: ` : '';
          return `${at}${i.message}`;
        }),
      });
    }
    req[source] = result.data;
    next();
  };
}

const email = z.string().email().max(255);
const password = z.string().min(8).max(128);

export const schemas = {
  register: z.object({
    name: z.string().trim().min(1).max(100),
    email, password,
  }),
  login: z.object({ email, password: z.string().min(1) }),
  refresh: z.object({ refreshToken: z.string().min(10) }),
  oauthExchange: z.object({ code: z.string().uuid() }),

  taskCreate: z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).default(''),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    status: z.enum(['todo', 'doing', 'done']).default('todo'),
  }),
  taskUpdate: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    status: z.enum(['todo', 'doing', 'done']).optional(),
    aiSummary: z.string().max(4000).nullable().optional(),
  }).refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' }),

  aiChat: z.object({
    message: z.string().trim().min(1).max(4000),
    history: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().max(8000),
    })).max(20).default([]),
  }),
  aiGenerate: z.object({
    topic: z.string().trim().min(1).max(300),
    content_type: z.string().max(60).default('task-description'),
    tone: z.string().max(40).default('neutral'),
    length: z.enum(['short', 'medium', 'long']).default('short'),
    keywords: z.string().max(300).default(''),
  }),
  aiSummarize: z.object({
    text: z.string().trim().min(1).max(20000),
    max_length: z.number().int().min(50).max(2000).default(300),
  }),
  aiRecommendations: z.looseObject({}).default({}),

  preferences: z.object({
    theme: z.enum(['light', 'dark']).optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
    }).optional(),
  }).refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' }),

  analyticsRange: z.object({
    range: z.enum(['7d', '30d']).default('30d'),
  }),
};
