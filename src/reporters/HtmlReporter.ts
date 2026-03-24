// src/reporters/HtmlReporter.ts
import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import { AgentReport } from '../agents/MetaAdsAgent';
import { settings } from '../config/settings';
import { logger } from '../utils/logger';

export class HtmlReporter {
  async generate(report: AgentReport): Promise<string> {
    const date = format(new Date(report.startedAt), 'dd MMM yyyy');
    const elapsed = Math.round(report.durationMs / 1000);

    const countryRows = Object.entries(report.byCountry)
      .map(([country, stats]) => `
        <tr>
          <td class="fw-bold">${country}</td>
          <td>${stats.competitors}</td>
          <td class="text-success">${stats.adsFound}</td>
          <td class="text-primary">${stats.screenshots}</td>
        </tr>`)
      .join('');

    const competitorRows = report.results
      .map(r => `
        <tr class="${r.errors.length ? 'table-warning' : ''} ${r.isPriority ? 'table-info' : ''}">
          <td>${r.country}</td>
          <td>${r.isPriority ? '⭐ ' : ''}${r.competitor}</td>
          <td>${r.adsFound}</td>
          <td>${r.screenshotsCaptured}</td>
          <td>${Math.round(r.durationMs / 1000)}s</td>
          <td>${r.errors.length > 0
            ? `<span class="badge bg-warning text-dark">${r.errors.length} errors</span>`
            : '<span class="badge bg-success">OK</span>'
          }</td>
        </tr>`)
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Midas Ads Monitor — ${date}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <style>
    body { background: #f8f9fa; font-family: 'Segoe UI', sans-serif; }
    .header-bar { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%); color: white; padding: 2rem; }
    .stat-card { border: none; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    .stat-number { font-size: 2.5rem; font-weight: 700; }
    table thead { background: #1a1a2e; color: white; }
  </style>
</head>
<body>
  <div class="header-bar mb-4">
    <div class="container">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h1 class="h3 mb-1">🪑 Midas Furniture</h1>
          <p class="mb-0 opacity-75">Competitor Ads Intelligence — ${date}</p>
        </div>
        <div class="text-end opacity-75">
          <small>Run ID: ${report.runId}<br/>Duration: ${elapsed}s</small>
        </div>
      </div>
    </div>
  </div>

  <div class="container pb-5">
    <!-- Summary stats -->
    <div class="row g-3 mb-4">
      ${[
        { label: 'Active Ads Found',     value: report.totalAds,         color: 'success', icon: '📊' },
        { label: 'Screenshots Captured', value: report.totalScreenshots,  color: 'primary', icon: '📸' },
        { label: 'Competitors Monitored',value: report.results.length,    color: 'info',    icon: '🏢' },
        { label: 'Errors',               value: report.totalErrors,       color: report.totalErrors > 0 ? 'warning' : 'success', icon: '⚠️' },
      ].map(s => `
        <div class="col-6 col-md-3">
          <div class="card stat-card p-3 text-center">
            <div class="fs-2">${s.icon}</div>
            <div class="stat-number text-${s.color}">${s.value}</div>
            <div class="text-muted small">${s.label}</div>
          </div>
        </div>`).join('')}
    </div>

    <!-- By country -->
    <div class="card stat-card mb-4">
      <div class="card-header fw-bold">Results by Country</div>
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead><tr><th>Country</th><th>Competitors</th><th>Ads Found</th><th>Screenshots</th></tr></thead>
          <tbody>${countryRows}</tbody>
        </table>
      </div>
    </div>

    <!-- Full competitor table -->
    <div class="card stat-card">
      <div class="card-header fw-bold">Competitor Detail
        <span class="badge bg-info ms-2">⭐ = KSA Priority</span>
      </div>
      <div class="table-responsive">
        <table class="table table-hover table-sm mb-0">
          <thead><tr><th>Country</th><th>Competitor</th><th>Ads</th><th>Screenshots</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>${competitorRows}</tbody>
        </table>
      </div>
    </div>

    <p class="text-muted text-center mt-4 small">
      Generated ${new Date(report.completedAt).toLocaleString('en-GB')} •
      Token: ${report.tokenInfo.valid ? `✅ ${report.tokenInfo.name}` : '⚠ Browser-only mode'}
    </p>
  </div>
</body>
</html>`;

    const reportDate = format(new Date(report.startedAt), 'yyyy-MM-dd');
    const outPath = path.join(settings.REPORTS_DIR, `${reportDate}_${report.runId}.html`);
    await fs.writeFile(outPath, html, 'utf-8');
    logger.info(`✓ HTML report: ${outPath}`);
    return outPath;
  }
}
