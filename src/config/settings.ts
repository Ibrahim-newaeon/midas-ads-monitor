// src/config/settings.ts
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const SettingsSchema = z.object({
  META_ACCESS_TOKEN: z.string().min(5, 'Meta access token required'),
  META_API_VERSION: z.string().default('v21.0'),
  SCREENSHOTS_BASE_DIR: z.string().default('./screenshots'),
  REPORTS_DIR: z.string().default('./reports'),
  DB_PATH: z.string().default('./data/monitor.db'),
  CRON_SCHEDULE: z.string().default('0 3 * * *'),
  MAX_RETRIES: z.coerce.number().default(3),
  RETRY_DELAY_MS: z.coerce.number().default(5000),
  SCROLL_DELAY_MS: z.coerce.number().default(2000),
  MAX_ADS_PER_COMPETITOR: z.coerce.number().default(50),
  HEADLESS: z
    .enum(['true', 'false'])
    .default('true')
    .transform(v => v === 'true'),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  KSA_PRIORITY_CLIENTS: z
    .string()
    .default('IKEASaudiArabia,PanEmiratesFurniture,homecentreSA')
    .transform(s => s.split(',').map(c => c.trim())),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('production'),
});

const parsed = SettingsSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid configuration:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const settings = parsed.data;
export type Settings = typeof settings;
