// src/scheduler/DailyScheduler.ts
import cron from 'node-cron';
import axios from 'axios';
import { MetaAdsAgent } from '../agents/MetaAdsAgent';
import { settings } from '../config/settings';
import { logger } from '../utils/logger';

export class DailyScheduler {
  private agent: MetaAdsAgent;
  private isRunning = false;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.agent = new MetaAdsAgent();
  }

  start(): void {
    if (!cron.validate(settings.CRON_SCHEDULE)) {
      throw new Error(`Invalid cron schedule: ${settings.CRON_SCHEDULE}`);
    }

    logger.info(`⏰ Scheduler started — cron: [${settings.CRON_SCHEDULE}] (Asia/Riyadh)`);

    this.task = cron.schedule(
      settings.CRON_SCHEDULE,
      async () => {
        if (this.isRunning) {
          logger.warn('⚠ Previous run still active — skipping this cycle');
          return;
        }
        await this.execute();
      },
      { timezone: 'Asia/Riyadh' }
    );
  }

  stop(): void {
    this.task?.stop();
    logger.info('Scheduler stopped');
  }

  async execute(): Promise<void> {
    this.isRunning = true;
    const start = Date.now();

    try {
      logger.info('▶ Daily monitoring run triggered');
      const report = await this.agent.run();
      const elapsed = Math.round((Date.now() - start) / 1000);

      const summary =
        `✅ *Midas Ads Monitor — Daily Run Complete*\n` +
        `📸 ${report.totalScreenshots} screenshots captured\n` +
        `📊 ${report.totalAds} active ads tracked\n` +
        `⚠️  ${report.totalErrors} errors\n` +
        `⏱ ${elapsed}s elapsed\n` +
        Object.entries(report.byCountry)
          .map(([c, s]) => `  • ${c}: ${s.screenshots} shots / ${s.adsFound} ads`)
          .join('\n');

      await this.notifySlack(summary);
    } catch (err) {
      const msg = `Agent run failed: ${(err as Error).message}`;
      logger.error(msg);
      await this.notifySlack(`❌ ${msg}`);
    } finally {
      this.isRunning = false;
    }
  }

  private async notifySlack(text: string): Promise<void> {
    if (!settings.SLACK_WEBHOOK_URL) return;
    try {
      await axios.post(settings.SLACK_WEBHOOK_URL, { text }, { timeout: 5000 });
      logger.debug('Slack notification sent');
    } catch {
      logger.warn('Slack notification failed — continuing');
    }
  }
}
