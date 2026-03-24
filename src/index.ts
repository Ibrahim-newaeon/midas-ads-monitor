// src/index.ts
import { PeakHourScheduler, ScheduleKey, PEAK_SCHEDULES } from './scheduler/PeakHourScheduler';
import { MetaAdsAgent } from './agents/MetaAdsAgent';
import { HtmlReporter } from './reporters/HtmlReporter';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  const args         = process.argv.slice(2);
  const dryRun       = args.includes('--dry-run');
  const runOnce      = args.includes('--run-once') || dryRun;
  const countryArg   = args.find(a => a.startsWith('--country='))?.split('=')[1];
  const scheduleMode = (process.env['SCHEDULE_MODE'] ?? 'MORNING_PEAK') as ScheduleKey;
  const dual         = args.includes('--dual-peak');

  logger.info('Midas Furniture - Ads Intelligence Monitor v1.0');
  logger.info(`    Mode:     ${runOnce ? (dryRun ? 'dry-run' : 'single run') : 'scheduled [' + scheduleMode + ']'}`);
  if (countryArg) logger.info(`    Filter:   ${countryArg}`);
  if (!runOnce) {
    const sched = PEAK_SCHEDULES[scheduleMode];
    logger.info(`    Schedule: ${sched ? sched.label : scheduleMode}`);
  }

  if (runOnce) {
    const agent    = new MetaAdsAgent();
    const reporter = new HtmlReporter();

    const validCountries = ['KSA', 'Qatar', 'Kuwait'] as const;
    type Country = typeof validCountries[number];

    const filter: Country[] | undefined = countryArg
      ? validCountries.filter(c => c === countryArg)
      : undefined;

    if (countryArg && (!filter || filter.length === 0)) {
      logger.error(`Unknown country: "${countryArg}". Valid: KSA, Qatar, Kuwait`);
      process.exit(1);
    }

    let report;
    if (dryRun) {
      const { runDryRun } = await import('./utils/dryRun');
      report = await runDryRun(filter);
    } else {
      report = await agent.run(filter);
    }

    const htmlPath = await reporter.generate(report);
    logger.info(`Done. Report: ${htmlPath}`);
    process.exit(0);

  } else {
    const scheduler = new PeakHourScheduler();
    if (dual) {
      scheduler.startDual();
    } else {
      scheduler.start(scheduleMode);
    }

    const shutdown = (sig: string) => {
      logger.info(`${sig} received - shutting down`);
      scheduler.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('uncaughtException',  (err)    => logger.error('Uncaught exception:', err));
    process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection:', reason as Error));

    logger.info('Daemon running. Press Ctrl+C to stop.');
  }
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
