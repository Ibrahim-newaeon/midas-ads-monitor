// src/utils/dryRun.ts
// Simulates a full agent run with realistic mock data.
// Produces real file structure + HTML report — identical to live run output.

import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import { COMPETITORS, COUNTRY_CODES, Country } from '../config/competitors.config';
import { settings } from '../config/settings';
import { FileManagerService } from '../services/FileManagerService';
import { HtmlReporter } from '../reporters/HtmlReporter';
import { AgentReport, CompetitorResult } from '../agents/MetaAdsAgent';
import { logger } from './logger';

// ─── Mock ad data per category ───────────────────────────────────────────────

const MOCK_ADS_BY_CATEGORY: Record<string, number> = {
  'mass-market': 12,
  'mid-range':    7,
  'premium':      4,
  'luxury':       2,
  'local':        3,
};

function generateMockScreenshot(competitorName: string, adIndex: number): Buffer {
  // SVG mini ad card rendered as PNG-sized buffer (realistic ~4KB placeholder)
  const colors = ['#e8f4fd','#fef9e7','#eafaf1','#fdf2f8','#f0f4ff'];
  const bg = colors[adIndex % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
    <rect width="600" height="400" fill="${bg}" rx="12"/>
    <rect x="20" y="20" width="560" height="200" fill="#ddd" rx="8" opacity="0.5"/>
    <text x="300" y="270" font-family="Arial" font-size="18" fill="#333" text-anchor="middle" font-weight="bold">${competitorName}</text>
    <text x="300" y="300" font-family="Arial" font-size="14" fill="#666" text-anchor="middle">Sponsored Ad #${adIndex}</text>
    <text x="300" y="330" font-family="Arial" font-size="12" fill="#999" text-anchor="middle">Captured: ${format(new Date(), 'dd MMM yyyy HH:mm')}</text>
    <rect x="180" y="350" width="240" height="36" fill="#1877f2" rx="6"/>
    <text x="300" y="374" font-family="Arial" font-size="14" fill="white" text-anchor="middle">Shop Now →</text>
  </svg>`;
  return Buffer.from(svg);
}

function generateMockMetadata(
  competitor: { name: string; fbPageName: string },
  country: Country,
  adCount: number
): Record<string, unknown> {
  const now = new Date();
  return {
    competitor: competitor.name,
    fbPageName: competitor.fbPageName,
    country,
    capturedAt: now.toISOString(),
    adsCount: adCount,
    source: 'dry-run-simulation',
    ads: Array.from({ length: adCount }, (_, i) => ({
      id: `ad_${Date.now()}_${i}`,
      createdAt: new Date(now.getTime() - Math.random() * 30 * 86400000).toISOString(),
      startedAt: new Date(now.getTime() - Math.random() * 14 * 86400000).toISOString(),
      snapshotUrl: `https://www.facebook.com/ads/archive/render_ad/?id=mock_${i}`,
      body: [
        `🛋️ Discover our latest ${['sofa','bedroom set','dining table','wardrobe'][i % 4]} collection.`,
        `Special Ramadan offer — up to 50% off on selected items. Shop now!`,
        `Transform your home with premium quality furniture. Free delivery in ${country === 'KSA' ? 'Saudi Arabia' : country}.`,
      ][i % 3],
      impressions: {
        lower_bound: String(Math.floor(Math.random() * 50000 + 10000)),
        upper_bound: String(Math.floor(Math.random() * 200000 + 50000)),
      },
      spend: {
        lower_bound: String(Math.floor(Math.random() * 500 + 100)),
        upper_bound: String(Math.floor(Math.random() * 2000 + 500)),
        currency: country === 'KSA' ? 'SAR' : country === 'Qatar' ? 'QAR' : 'KWD',
      },
      fundingEntity: competitor.name,
    })),
  };
}

// ─── Main dry-run executor ────────────────────────────────────────────────────

export async function runDryRun(countriesFilter?: Country[]): Promise<AgentReport> {
  const runId    = `dryrun_${Date.now()}`;
  const startedAt = new Date().toISOString();
  const startMs   = Date.now();
  const fileSvc   = new FileManagerService();
  const results: CompetitorResult[] = [];

  logger.info(`${'═'.repeat(60)}`);
  logger.info(`  Midas Ads Monitor — DRY RUN [${runId}]`);
  logger.info(`  (Simulated data — Meta API/browser blocked in sandbox)`);
  logger.info(`${'═'.repeat(60)}`);

  await fileSvc.initDirectories();

  const countries = countriesFilter ?? (['KSA', 'Qatar', 'Kuwait'] as Country[]);

  for (const country of countries) {
    logger.info(`\n┌─ Country: ${country} ${'─'.repeat(40 - country.length)}`);

    let competitors = [...COMPETITORS[country]];

    // KSA priority sort
    if (country === 'KSA') {
      const priority = competitors.filter(c =>
        settings.KSA_PRIORITY_CLIENTS.includes(c.fbPageName)
      );
      const rest = competitors.filter(c =>
        !settings.KSA_PRIORITY_CLIENTS.includes(c.fbPageName)
      );
      competitors = [...priority, ...rest];
      logger.info(`│  ⭐ Priority: ${priority.map(p => p.name).join(', ')}`);
    }

    for (let i = 0; i < competitors.length; i++) {
      const comp       = competitors[i];
      const isPriority = country === 'KSA' && settings.KSA_PRIORITY_CLIENTS.includes(comp.fbPageName);
      const adCount    = MOCK_ADS_BY_CATEGORY[comp.category] ?? 5;
      const startComp  = Date.now();

      logger.info(`│  [${String(i + 1).padStart(2)}/${competitors.length}] ${comp.name}${isPriority ? ' ⭐' : ''} — ${adCount} mock ads`);

      // Save metadata JSON
      await fileSvc.saveMetadata(country, comp.name, generateMockMetadata(comp, country, adCount));

      // Save mock screenshots
      let screenshotsCaptured = 0;
      for (let j = 0; j < adCount; j++) {
        const buf = generateMockScreenshot(comp.name, j + 1);
        await fileSvc.saveScreenshot(buf, country, comp.name, j + 1, `mock_${j}`);
        screenshotsCaptured++;
      }

      results.push({
        country,
        competitor: comp.name,
        fbPageName: comp.fbPageName,
        isPriority,
        adsFound: adCount,
        screenshotsCaptured,
        errors: [],
        durationMs: Date.now() - startComp,
        capturedAt: new Date().toISOString(),
      });

      logger.info(`│     → ✓ ${screenshotsCaptured} screenshots saved`);
    }

    await fileSvc.writeSummaryIndex(country, new Date(), results.filter(r => r.country === country));
    logger.info(`└─ ${country} done`);
  }

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
    durationMs: Date.now() - startMs,
    tokenInfo: { valid: false, error: 'Dry run — sandbox network restriction' },
    byCountry,
    results,
    totalAds: results.reduce((s, r) => s + r.adsFound, 0),
    totalScreenshots: results.reduce((s, r) => s + r.screenshotsCaptured, 0),
    totalErrors: 0,
  };

  // Save JSON report
  const dateStr    = format(new Date(), 'yyyy-MM-dd');
  const reportPath = path.join(settings.REPORTS_DIR, `${dateStr}_${runId}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  logger.info(`\n${'═'.repeat(60)}`);
  logger.info(`  DRY RUN Complete`);
  logger.info(`  📸 ${report.totalScreenshots} mock screenshots written`);
  logger.info(`  📊 ${report.totalAds} simulated active ads`);
  logger.info(`  ⏱  ${Math.round(report.durationMs / 1000)}s`);
  logger.info(`  📄 JSON: ${reportPath}`);
  logger.info(`${'═'.repeat(60)}\n`);

  return report;
}
