// src/services/MetaApiService.ts
// Uses official Meta Ad Library API — ToS compliant
import axios, { AxiosInstance, AxiosError } from 'axios';
import { z } from 'zod';
import { settings } from '../config/settings';
import { logger } from '../utils/logger';
import { withRetry } from '../utils/retry';
import { CountryCode } from '../config/competitors.config';

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const AdSchema = z.object({
  id: z.string(),
  ad_creation_time: z.string().optional(),
  ad_delivery_start_time: z.string().optional(),
  ad_delivery_stop_time: z.string().optional(),
  ad_snapshot_url: z.string().url().optional(),
  page_id: z.string().optional(),
  page_name: z.string().optional(),
  ad_creative_bodies: z.array(z.string()).optional(),
  ad_creative_link_titles: z.array(z.string()).optional(),
  impressions: z
    .object({ lower_bound: z.string(), upper_bound: z.string() })
    .optional(),
  spend: z
    .object({ lower_bound: z.string(), upper_bound: z.string(), currency: z.string() })
    .optional(),
  currency: z.string().optional(),
  funding_entity: z.string().optional(),
});

const PagingSchema = z.object({
  cursors: z
    .object({ before: z.string(), after: z.string() })
    .optional(),
  next: z.string().optional(),
});

const AdsResponseSchema = z.object({
  data: z.array(AdSchema),
  paging: PagingSchema.optional(),
});

export type Ad = z.infer<typeof AdSchema>;

// ─── Error types ────────────────────────────────────────────────────────────

export class MetaApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly type?: string
  ) {
    super(message);
    this.name = 'MetaApiError';
  }
}

// ─── Service ────────────────────────────────────────────────────────────────

export class MetaApiService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = `https://graph.facebook.com/${settings.META_API_VERSION}`;
    this.client = axios.create({ baseURL: this.baseUrl, timeout: 30_000 });
  }

  /** Fetch all ACTIVE ads for a page in a given country, with pagination */
  async fetchActiveAds(
    searchTerm: string,
    countryCode: CountryCode,
    maxAds = settings.MAX_ADS_PER_COMPETITOR
  ): Promise<Ad[]> {
    const ads: Ad[] = [];
    let afterCursor: string | undefined;
    let page = 0;

    do {
      const params: Record<string, string> = {
        access_token: settings.META_ACCESS_TOKEN,
        ad_reached_countries: JSON.stringify([countryCode]),
        search_terms: searchTerm,
        ad_active_status: 'ACTIVE',
        ad_type: 'ALL',
        limit: '25',
        fields: [
          'id',
          'ad_creation_time',
          'ad_delivery_start_time',
          'ad_snapshot_url',
          'page_id',
          'page_name',
          'ad_creative_bodies',
          'ad_creative_link_titles',
          'impressions',
          'spend',
          'currency',
          'funding_entity',
        ].join(','),
      };

      if (afterCursor) params['after'] = afterCursor;

      const response = await withRetry(
        async () => {
          try {
            return await this.client.get('/ads_archive', { params });
          } catch (err) {
            const axiosErr = err as AxiosError<{ error?: { message: string; code: number; type: string } }>;
            const meta = axiosErr.response?.data?.error;
            if (meta) throw new MetaApiError(meta.message, meta.code, meta.type);
            throw err;
          }
        },
        {
          label: `MetaAPI[${searchTerm}/${countryCode}]`,
          maxRetries: settings.MAX_RETRIES,
          delayMs: settings.RETRY_DELAY_MS,
        }
      );

      const parsed = AdsResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.error('Meta API schema mismatch', { errors: parsed.error.flatten() });
        break;
      }

      ads.push(...parsed.data.data);
      afterCursor = parsed.data.paging?.cursors?.after;
      page++;

      logger.debug(`  Page ${page}: +${parsed.data.data.length} ads [${searchTerm}/${countryCode}]`);

      if (ads.length >= maxAds) break;
      if (!parsed.data.paging?.next) break;

      // Polite pause between pages
      await new Promise(res => setTimeout(res, 1000));

    } while (afterCursor);

    return ads.slice(0, maxAds);
  }

  /** Verify the token is valid before starting any job */
  async verifyToken(): Promise<{ valid: boolean; name?: string; id?: string; error?: string }> {
    try {
      const res = await this.client.get('/me', {
        params: { access_token: settings.META_ACCESS_TOKEN, fields: 'id,name' },
      });
      return { valid: true, name: res.data.name, id: res.data.id };
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: { message: string } }>;
      const msg = axiosErr.response?.data?.error?.message ?? (err as Error).message;
      return { valid: false, error: msg };
    }
  }
}
