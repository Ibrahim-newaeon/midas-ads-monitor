// src/services/FileManagerService.ts
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import { settings } from '../config/settings';
import { logger } from '../utils/logger';
import { Country } from '../config/competitors.config';

export class FileManagerService {
  private baseDir: string;

  constructor() {
    this.baseDir = settings.SCREENSHOTS_BASE_DIR;
  }

  getCompetitorDir(country: Country, competitorName: string, date?: Date): string {
    const dateStr = format(date ?? new Date(), 'yyyy-MM-dd');
    const safeName = competitorName.replace(/[^a-zA-Z0-9\-]/g, '_').replace(/_+/g, '_');
    return path.join(this.baseDir, country, dateStr, safeName);
  }

  async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  async saveScreenshot(
    buffer: Buffer,
    country: Country,
    competitorName: string,
    adIndex: number,
    adId?: string
  ): Promise<string> {
    const dir = this.getCompetitorDir(country, competitorName);
    await this.ensureDir(dir);
    const suffix = adId ? `_${adId.slice(0, 12)}` : '';
    const filename = `ad_${String(adIndex).padStart(3, '0')}${suffix}.png`;
    const fullPath = path.join(dir, filename);
    await fs.writeFile(fullPath, buffer);
    logger.debug(`Saved: ${fullPath}`);
    return fullPath;
  }

  async saveMetadata(
    country: Country,
    competitorName: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const dir = this.getCompetitorDir(country, competitorName);
    await this.ensureDir(dir);
    const metaPath = path.join(dir, 'metadata.json');
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
    logger.debug(`Metadata saved: ${metaPath}`);
  }

  async listTodayCaptures(country: Country): Promise<string[]> {
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const dir = path.join(this.baseDir, country, dateStr);
    try {
      return await fs.readdir(dir);
    } catch {
      return [];
    }
  }

  async initDirectories(): Promise<void> {
    const countries: Country[] = ['KSA', 'Qatar', 'Kuwait'];
    for (const c of countries) {
      await this.ensureDir(path.join(this.baseDir, c));
    }
    await this.ensureDir(settings.REPORTS_DIR);
    await this.ensureDir('logs');
    await this.ensureDir('data');
    logger.info('✓ Directory structure initialized');
  }

  async writeSummaryIndex(country: Country, date: Date, results: unknown[]): Promise<void> {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dir = path.join(this.baseDir, country, dateStr);
    await this.ensureDir(dir);
    await fs.writeFile(
      path.join(dir, 'index.json'),
      JSON.stringify({ country, date: dateStr, results }, null, 2)
    );
  }
}
