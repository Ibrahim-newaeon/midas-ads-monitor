// src/services/ScreenshotService.ts
import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { settings } from '../config/settings';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';
import { Ad } from './MetaApiService';

export interface BrowserCaptureResult {
  adIndex: number;
  screenshot: Buffer;
  capturedAt: string;
}

export class ScreenshotService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async init(): Promise<void> {
    const executablePath =
      process.env['CHROMIUM_EXECUTABLE_PATH'] ??
      process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'] ??
      undefined;
    if (executablePath) logger.info('  Using Chromium: ' + executablePath);
    this.browser = await chromium.launch({
      headless: settings.HEADLESS,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--lang=en-US',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/124.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'Asia/Riyadh',
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8' },
    });

    // Block fonts, analytics, tracking to speed up loads
    await this.context.route(/\.(woff2?|ttf|otf)(\?.*)?$/, r => r.abort());
    await this.context.route(/analytics|gtm|doubleclick|facebook\.com\/tr|pixel/, r => r.abort());

    logger.info('✓ Chromium browser initialized');
  }

  /** Screenshot an individual ad from its public snapshot URL (Meta transparency page) */
  async captureAdSnapshot(ad: Ad): Promise<Buffer | null> {
    if (!this.context || !ad.ad_snapshot_url) return null;

    return withRetry(
      async () => {
        const page = await this.context!.newPage();
        try {
          await page.goto(ad.ad_snapshot_url!, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
          });
          await page.waitForTimeout(settings.SCROLL_DELAY_MS);

          // Try the ad card container first, then fall back to full page crop
          const selectors = [
            '[data-testid="ad-archive-render-ad-card"]',
            '[role="article"]',
            '._7jyr',
            '.x1qjc9v5',
          ];

          for (const sel of selectors) {
            const el = page.locator(sel).first();
            if (await el.count() > 0) {
              return await el.screenshot({ type: 'png' });
            }
          }

          // Full page fallback — crop to viewport
          return await page.screenshot({
            type: 'png',
            clip: { x: 0, y: 0, width: 1440, height: 900 },
          });
        } finally {
          await page.close();
        }
      },
      { label: `Snapshot[${ad.id}]`, maxRetries: 2, delayMs: 3000 }
    );
  }

  /**
   * Fallback: browse Meta Ads Library search page directly and
   * screenshot each ad card. Used when API returns 0 results.
   */
  async captureFromLibrarySearch(
    searchTerm: string,
    countryCode: string
  ): Promise<Buffer[]> {
    if (!this.context) throw new Error('Browser not initialized');

    const screenshots: Buffer[] = [];
    const url = [
      'https://www.facebook.com/ads/library/',
      `?active_status=active`,
      `&ad_type=all`,
      `&country=${countryCode}`,
      `&q=${encodeURIComponent(searchTerm)}`,
      `&search_type=page`,
    ].join('');

    const page = await this.context.newPage();

    try {
      logger.debug(`  Browser fallback: ${url}`);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(3000);

      // Dismiss cookie consent if present
      for (const selector of [
        '[data-testid="cookie-policy-manage-dialog-accept-button"]',
        'button:has-text("Allow all cookies")',
        'button:has-text("Accept all")',
      ]) {
        try {
          await page.click(selector, { timeout: 2000 });
          logger.debug('  Cookie dialog dismissed');
          break;
        } catch { /* no dialog — continue */ }
      }

      await page.waitForTimeout(2000);

      // Scroll to trigger lazy-loading
      await this.autoScroll(page, settings.MAX_ADS_PER_COMPETITOR);

      // Capture each ad card
      const cardSelector = '[data-testid="ad-archive-render-ad-card"]';
      const count = await page.locator(cardSelector).count();

      logger.info(`  Found ${count} ad cards for "${searchTerm}" (${countryCode})`);

      for (let i = 0; i < Math.min(count, settings.MAX_ADS_PER_COMPETITOR); i++) {
        try {
          const card = page.locator(cardSelector).nth(i);
          await card.scrollIntoViewIfNeeded();
          await page.waitForTimeout(400);
          const buf = await card.screenshot({ type: 'png' });
          screenshots.push(buf);
        } catch (err) {
          logger.warn(`  Card ${i} screenshot failed for "${searchTerm}": ${(err as Error).message}`);
        }
      }
    } finally {
      await page.close();
    }

    return screenshots;
  }

  private async autoScroll(page: Page, targetAds: number): Promise<void> {
    let prevCount = 0;
    let staleRounds = 0;

    for (let i = 0; i < 25; i++) {
      await page.evaluate(() => (window as Window).scrollBy(0, (window as Window).innerHeight * 2));
      await page.waitForTimeout(settings.SCROLL_DELAY_MS);

      const count = await page
        .locator('[data-testid="ad-archive-render-ad-card"]')
        .count();

      if (count >= targetAds) break;
      if (count === prevCount) {
        staleRounds++;
        if (staleRounds >= 3) break;
      } else {
        staleRounds = 0;
      }
      prevCount = count;
    }
  }

  async teardown(): Promise<void> {
    try {
      await this.context?.close();
      await this.browser?.close();
    } catch { /* ignore on teardown */ }
    this.browser = null;
    this.context = null;
    logger.info('✓ Browser closed');
  }

  isReady(): boolean {
    return this.browser !== null && this.context !== null;
  }
}
