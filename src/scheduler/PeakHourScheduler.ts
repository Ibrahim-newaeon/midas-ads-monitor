// src/scheduler/PeakHourScheduler.ts
// Runs at 9:00 AM Gulf Standard Time (GST = UTC+4) daily — peak social media browsing hour
// Falls back to 3 AM if peak window unavailable
import cron from 'node-cron';
import axios from 'axios';
import { MetaAdsAgent } from '../agents/MetaAdsAgent';
import { HtmlReporter } from '../reporters/HtmlReporter';
import { settings } from '../config/settings';
import { logger } from '../utils/logger';

// ─── Gulf peak-hour schedule config ──────────────────────────────────────────
// Research: Gulf Instagram/Facebook peak = 8–11 AM & 8–11 PM GST
// We run at 9 AM GST (= 05:00 UTC) to capture overnight launched ads
// before the morning spend spike fully kicks in — maximum data freshness

export const PEAK_SCHEDULES = {
  MORNING_PEAK:  { cron: '0 5 * * *',  label: '09:00 GST (morning peak)',  tz: 'Asia/Dubai' },
  EVENING_PEAK:  { cron: '0 17 * * *', label: '21:00 GST (evening peak)',  tz: 'Asia/Dubai' },
  OFF_PEAK:      { cron: '0 23 * * *', label: '03:00 GST (overnight safe)', tz: 'Asia/Dubai' },
} as const;

export type ScheduleKey = keyof typeof PEAK_SCHEDULES;

export class PeakHourScheduler {
  private agent     = new MetaAdsAgent();
  private reporter  = new HtmlReporter();
  private isRunning = false;
  private tasks: cron.ScheduledTask[] = [];

  start(scheduleKey: ScheduleKey = 'MORNING_PEAK'): void {
    const schedule = PEAK_SCHEDULES[scheduleKey];

    if (!cron.validate(schedule.cron)) {
      throw new Error(`Invalid cron: ${schedule.cron}`);
    }

    logger.info(`⏰  Scheduler: ${schedule.label}`);
    logger.info(`    Cron:     [${schedule.cron}] timezone: ${schedule.tz}`);
    logger.info(`    Markets:  KSA → Qatar → Kuwait`);

    const task = cron.schedule(schedule.cron, () => this.execute(), {
      timezone: schedule.tz,
    });

    this.tasks.push(task);
    logger.info('    Status:   RUNNING — waiting for next trigger');
  }

  /** Allow dual-schedule: run at both morning and evening peaks */
  startDual(): void {
    logger.info('⏰  Dual-peak mode: morning + evening');
    for (const key of ['MORNING_PEAK', 'EVENING_PEAK'] as ScheduleKey[]) {
      this.start(key);
    }
  }

  async execute(): Promise<void> {
    if (this.isRunning) {
      logger.warn('⚠  Previous run still active — skipping');
      return;
    }

    this.isRunning = true;
    const t0 = Date.now();

    try {
      logger.info('▶  Peak-hour run triggered');

      const report   = await this.agent.run();
      const htmlPath = await this.reporter.generate(report);
      const elapsed  = Math.round((Date.now() - t0) / 1000);

      const msg =
        `✅ *Midas Ads Monitor — Daily Run*\n` +
        `📅 ${new Date().toISOString().split('T')[0]}\n` +
        `━━━━━━━━━━━━━━━\n` +
        Object.entries(report.byCountry)
          .map(([c, s]) => {
            const flag = { KSA:'🇸🇦', Qatar:'🇶🇦', Kuwait:'🇰🇼' }[c] ?? '';
            return `${flag} *${c}:* ${s.adsFound} ads · ${s.screenshots} shots`;
          }).join('\n') +
        `\n━━━━━━━━━━━━━━━\n` +
        `📸 *Total:* ${report.totalScreenshots} screenshots\n` +
        `⏱ ${elapsed}s · ⚠️ ${report.totalErrors} errors\n` +
        `📄 Report: ${htmlPath}`;

      logger.info(msg.replace(/\*/g, ''));
      await this.notify(msg);

    } catch (err) {
      const msg = `❌ Agent run failed: ${(err as Error).message}`;
      logger.error(msg);
      await this.notify(msg);
    } finally {
      this.isRunning = false;
    }
  }

  stop(): void {
    this.tasks.forEach(t => t.stop());
    logger.info('Scheduler stopped');
  }

  private async notify(text: string): Promise<void> {
    if (!settings.SLACK_WEBHOOK_URL) return;
    try {
      await axios.post(settings.SLACK_WEBHOOK_URL, { text }, { timeout: 5000 });
    } catch {
      logger.warn('Slack notification failed');
    }
  }
}
