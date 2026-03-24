// src/agents/MetaAdsAgent.ts
import { format } from 'date-fns';
import fs from 'fs/promises';
import { COMPETITORS, COUNTRY_CODES, Country } from '../config/competitors.config';
import { settings } from '../config/settings';
import { MetaApiService } from '../services/MetaApiService';
import { ScreenshotService } from '../services/ScreenshotService';
import { FileManagerService } from '../services/FileManagerService';
import { logger } from '../utils/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CompetitorResult {
  country: Country;
  competitor: string;
  fbPageName: string;
  isPriority: boolean;
  adsFound: number;
  screenshotsCaptured: number;
  errors: string[];
  durationMs: number;
  capturedAt: string;
}

export interface AgentReport {
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  tokenInfo: { valid: boolean; name?: string; id?: string; error?: string };
  byCountry: Record<Country, { adsFound: number; screenshots: number; competitors: number }>;
  results: CompetitorResult[];
  totalAds: number;
  totalScreenshots: number;
  totalErrors: number;
}

// ─── Agent ──────────────────────────────────────────────────────────────────

export class MetaAdsAgent {
  private metaApi: MetaApiService;
  private screenshotSvc: ScreenshotService;
  private fileSvc: FileManagerService;

  constructor() {
    this.metaApi = new MetaApiService();
    this.screenshotSvc = new ScreenshotService();
    this.fileSvc = new FileManagerService();
  }

  async run(countriesFilter?: Country[]): Promise<AgentReport> {
    const runId = `run_${Date.now()}`;
    const startTime = Date.now();
    const startedAt = new Date().toISOString();
    const results: CompetitorResult[] = [];

    logger.info(`${'═'.repeat(60)}`);
    logger.info(`  Midas Ads Monitor — Run Started  [${runId}]`);
    logger.info(`${'═'.repeat(60)}`);

    // ── 1. Token verification ──────────────────────────────────────────────
    const tokenInfo = await this.metaApi.verifyToken();

    if (!tokenInfo.valid) {
      logger.warn(`⚠  Meta API token check: ${tokenInfo.error}`);
      logger.warn(`   Running in BROWSER-ONLY mode (no API data — screenshots only)`);
    } else {
      logger.info(`✓ Meta API token valid — Account: ${tokenInfo.name} (${tokenInfo.id})`);
    }

    // ── 2. Init filesystem + browser ──────────────────────────────────────
    await this.fileSvc.initDirectories();
    await this.screenshotSvc.init();

    const countries = countriesFilter ?? (['KSA', 'Qatar', 'Kuwait'] as Country[]);

    // ── 3. Process each country ────────────────────────────────────────────
    for (const country of countries) {
      logger.info(`\n┌─ Country: ${country} ${'─'.repeat(40 - country.length)}`);

      let competitors = [...COMPETITORS[country]];

      // KSA: priority clients first
      if (country === 'KSA') {
        const priority = competitors.filter(c =>
          settings.KSA_PRIORITY_CLIENTS.includes(c.fbPageName)
        );
        const rest = competitors.filter(c =>
          !settings.KSA_PRIORITY_CLIENTS.includes(c.fbPageName)
        );
        competitors = [...priority, ...rest];
        logger.info(`│  Priority clients: ${priority.map(p => p.name).join(', ')}`);
      }

      logger.info(`│  Monitoring ${competitors.length} competitors`);

      for (let i = 0; i < competitors.length; i++) {
        const comp = competitors[i];
        const isPriority =
          country === 'KSA' &&
          settings.KSA_PRIORITY_CLIENTS.includes(comp.fbPageName);

        logger.info(`│  [${i + 1}/${competitors.length}] ${comp.name}${isPriority ? ' ⭐' : ''}`);

        const result = await this.processCompetitor(
          country,
          comp.name,
          comp.fbPageName,
          isPriority,
          tokenInfo.valid
        );
        results.push(result);

        logger.info(
          `│     → ${result.screenshotsCaptured} screenshots | ` +
          `${result.adsFound} ads | ` +
          `${result.durationMs}ms` +
          (result.errors.length ? ` | ⚠ ${result.errors.length} errors` : '')
        );

        // Polite delay between competitors
        if (i < competitors.length - 1) {
          await new Promise(res => setTimeout(res, 2500));
        }
      }

      // Write per-country day index
      const countryResults = results.filter(r => r.country === country);
      await this.fileSvc.writeSummaryIndex(country, new Date(), countryResults);

      logger.info(`└─ ${country} complete`);
    }

    // ── 4. Teardown & report ───────────────────────────────────────────────
    await this.screenshotSvc.teardown();

    const byCountry = {} as AgentReport['byCountry'];
    for (const c of countries) {
      const cr = results.filter(r => r.country === c);
      byCountry[c] = {
        competitors: cr.length,
        adsFound: cr.reduce((s, r) => s + r.adsFound, 0),
        screenshots: cr.reduce((s, r) => s + r.screenshotsCaptured, 0),
      };
    }

    const report: AgentReport = {
      runId,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      tokenInfo,
      byCountry,
      results,
      totalAds: results.reduce((s, r) => s + r.adsFound, 0),
      totalScreenshots: results.reduce((s, r) => s + r.screenshotsCaptured, 0),
      totalErrors: results.reduce((s, r) => s + r.errors.length, 0),
    };

    // Save JSON report
    const reportDate = format(new Date(), 'yyyy-MM-dd');
    const reportPath = `${settings.REPORTS_DIR}/${reportDate}_${runId}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    logger.info(`\n${'═'.repeat(60)}`);
    logger.info(`  Run Complete [${runId}]`);
    logger.info(`  📸 ${report.totalScreenshots} screenshots`);
    logger.info(`  📊 ${report.totalAds} active ads tracked`);
    logger.info(`  ⏱  ${Math.round(report.durationMs / 1000)}s`);
    if (report.totalErrors > 0) logger.warn(`  ⚠  ${report.totalErrors} errors`);
    logger.info(`  📄 Report: ${reportPath}`);
    logger.info(`${'═'.repeat(60)}\n`);

    return report;
  }

  // ── Per-competitor processing ──────────────────────────────────────────────

  private async processCompetitor(
    country: Country,
    name: string,
    fbPageName: string,
    isPriority: boolean,
    tokenValid: boolean
  ): Promise<CompetitorResult> {
    const startMs = Date.now();
    const errors: string[] = [];
    let adsFound = 0;
    let screenshotsCaptured = 0;
    const countryCode = COUNTRY_CODES[country];

    try {
      if (tokenValid) {
        // ── Path A: Official API ─────────────────────────────────────────
        const ads = await this.metaApi.fetchActiveAds(fbPageName, countryCode);
        adsFound = ads.length;

        if (ads.length === 0) {
          logger.debug(`    API: 0 ads — trying browser fallback`);
          const shots = await this.screenshotSvc.captureFromLibrarySearch(fbPageName, countryCode);
          adsFound = shots.length;
          for (let i = 0; i < shots.length; i++) {
            await this.fileSvc.saveScreenshot(shots[i], country, name, i + 1);
            screenshotsCaptured++;
          }
        } else {
          // Save structured metadata first
          await this.fileSvc.saveMetadata(country, name, {
            competitor: name,
            fbPageName,
            country,
            capturedAt: new Date().toISOString(),
            adsCount: ads.length,
            ads: ads.map(a => ({
              id: a.id,
              createdAt: a.ad_creation_time,
              startedAt: a.ad_delivery_start_time,
              snapshotUrl: a.ad_snapshot_url,
              body: a.ad_creative_bodies?.[0]?.slice(0, 300),
              impressions: a.impressions,
              spend: a.spend,
              fundingEntity: a.funding_entity,
            })),
          });

          // Screenshot each ad via its snapshot URL
          for (let i = 0; i < ads.length; i++) {
            const ad = ads[i];
            try {
              const shot = await this.screenshotSvc.captureAdSnapshot(ad);
              if (shot) {
                await this.fileSvc.saveScreenshot(shot, country, name, i + 1, ad.id);
                screenshotsCaptured++;
              }
            } catch (err) {
              const msg = `Ad ${ad.id} screenshot failed: ${(err as Error).message}`;
              errors.push(msg);
              logger.warn(`    ⚠ ${msg}`);
            }

            // Polite rate between screenshots
            if (i < ads.length - 1) await new Promise(res => setTimeout(res, 700));
          }
        }
      } else {
        // ── Path B: Browser-only (no API token) ─────────────────────────
        const shots = await this.screenshotSvc.captureFromLibrarySearch(fbPageName, countryCode);
        adsFound = shots.length;
        for (let i = 0; i < shots.length; i++) {
          await this.fileSvc.saveScreenshot(shots[i], country, name, i + 1);
          screenshotsCaptured++;
        }
      }
    } catch (err) {
      const msg = `Fatal: ${(err as Error).message}`;
      errors.push(msg);
      logger.error(`    ✗ ${msg}`, { country, competitor: name });
    }

    return {
      country,
      competitor: name,
      fbPageName,
      isPriority,
      adsFound,
      screenshotsCaptured,
      errors,
      durationMs: Date.now() - startMs,
      capturedAt: new Date().toISOString(),
    };
  }
}
