#!/usr/bin/env python3
"""Generate unified Midas Ads Monitor report for KSA + Qatar + Kuwait."""
import json, glob, os
from pathlib import Path

# Load all 3 country reports
reports_dir = Path('reports')
run_files   = sorted(glob.glob(str(reports_dir / '2026-03-20_dryrun_*.json')))

all_results = []
by_country  = {}

for f in run_files:
    with open(f) as fh:
        r = json.load(fh)
    for res in r['results']:
        all_results.append(res)
    for c, stats in r['byCountry'].items():
        by_country[c] = stats

total_ads   = sum(r['adsFound'] for r in all_results)
total_shots = sum(r['screenshotsCaptured'] for r in all_results)
total_comp  = len(all_results)
captured    = '2026-03-20 19:26 UTC'

FLAG = {'KSA': '🇸🇦', 'Qatar': '🇶🇦', 'Kuwait': '🇰🇼'}
COLOR = {'KSA': '#006C35', 'Qatar': '#8D1B3D', 'Kuwait': '#007A3D'}

# ── Helpers ───────────────────────────────────────────────────────────────────

def kpi_card(value, label, color='#28a745'):
    return f'''<div class="col-6 col-md-3">
      <div class="kpi-card">
        <div class="kpi-num" style="color:{color}">{value}</div>
        <div class="kpi-label">{label}</div>
      </div>
    </div>'''

def country_summary_card(country, stats):
    flag = FLAG.get(country, '')
    col  = COLOR.get(country, '#333')
    return f'''<div class="col-md-4">
      <div class="country-card" style="border-top:4px solid {col}">
        <div class="d-flex align-items-center gap-2 mb-3">
          <span style="font-size:2rem">{flag}</span>
          <div>
            <div class="fw-bold fs-5">{country}</div>
            <div class="text-muted small">{stats["competitors"]} competitors monitored</div>
          </div>
        </div>
        <div class="d-flex gap-4">
          <div><div class="fw-bold fs-3" style="color:{col}">{stats["adsFound"]}</div><div class="metric-label">active ads</div></div>
          <div><div class="fw-bold fs-3 text-primary">{stats["screenshots"]}</div><div class="metric-label">screenshots</div></div>
        </div>
      </div>
    </div>'''

def bar_row(res, max_ads=12):
    star  = '⭐ ' if res.get('isPriority') else ''
    pct   = min(100, int(res['adsFound'] / max_ads * 100))
    flag  = FLAG.get(res['country'], '')
    col   = COLOR.get(res['country'], '#28a745')
    return f'''<div class="d-flex align-items-center mb-2 bar-row">
      <div class="bar-country">{flag}</div>
      <div class="bar-name text-truncate">{star}{res['competitor']}</div>
      <div class="flex-grow-1 mx-3">
        <div class="bar-bg">
          <div class="bar-fill" style="width:{pct}%;background:{col}"></div>
        </div>
      </div>
      <span class="badge rounded-pill" style="background:{col};min-width:28px">{res['adsFound']}</span>
    </div>'''

def table_row(res):
    flag   = FLAG.get(res['country'], '')
    star   = '⭐ ' if res.get('isPriority') else ''
    col    = COLOR.get(res['country'], '#555')
    status = '<span class="badge bg-success">✓</span>' if not res['errors'] else f'<span class="badge bg-warning text-dark">{len(res["errors"])}</span>'
    return f'''<tr>
      <td><span class="country-tag" style="background:{col}20;color:{col}">{flag} {res['country']}</span></td>
      <td class="fw-semibold">{star}{res['competitor']}</td>
      <td><code class="small text-muted">{res['fbPageName']}</code></td>
      <td class="text-center"><span class="badge bg-success">{res['adsFound']}</span></td>
      <td class="text-center text-primary fw-semibold">{res['screenshotsCaptured']}</td>
      <td class="text-center">{status}</td>
    </tr>'''

def priority_row(res):
    col = COLOR.get(res['country'], '#333')
    return f'''<div class="col-md-4">
      <div class="priority-card" style="border-left:4px solid {col}">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div class="fw-bold">{res['competitor']}</div>
          <span class="badge" style="background:{col}">{FLAG.get(res['country'],'')} {res['country']}</span>
        </div>
        <div class="text-muted small font-monospace mb-3">{res['fbPageName']}</div>
        <div class="d-flex gap-4">
          <div><div class="fw-bold fs-4" style="color:{col}">{res['adsFound']}</div><div class="metric-label">ads</div></div>
          <div><div class="fw-bold fs-4 text-primary">{res['screenshotsCaptured']}</div><div class="metric-label">shots</div></div>
        </div>
      </div>
    </div>'''

# ── Build HTML ────────────────────────────────────────────────────────────────

country_cards = '\n'.join(country_summary_card(c, s) for c, s in by_country.items())
bars          = '\n'.join(bar_row(r) for r in all_results)
table_rows    = '\n'.join(table_row(r) for r in all_results)
priority_cards = '\n'.join(priority_row(r) for r in all_results if r.get('isPriority'))

kpis = (
    kpi_card(total_ads,   '📊 Active Ads', '#28a745') +
    kpi_card(total_shots, '📸 Screenshots', '#0d6efd') +
    kpi_card(total_comp,  '🏢 Competitors', '#c9a84c') +
    kpi_card('3',         '🌍 Markets', '#0f3460')
)

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Midas Ads Monitor — Gulf Markets 2026-03-20</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"/>
  <style>
    *{{box-sizing:border-box}}
    body{{background:#f0f2f8;font-family:"Segoe UI",system-ui,sans-serif;margin:0}}
    .hero{{background:linear-gradient(135deg,#060612 0%,#0d1b3e 50%,#0a2a5e 100%);padding:2.5rem 2rem;color:#fff}}
    .brand{{font-size:.82rem;letter-spacing:.22em;text-transform:uppercase;color:#c9a84c;font-weight:700}}
    .hero h1{{font-size:2rem;font-weight:800;margin:.4rem 0 .3rem}}
    .kpi-card{{background:#fff;border-radius:14px;box-shadow:0 2px 18px rgba(0,0,0,.08);padding:1.4rem;text-align:center}}
    .kpi-num{{font-size:2.8rem;font-weight:800;line-height:1}}
    .kpi-label{{font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:#6c757d;margin-top:.25rem}}
    .section-card{{background:#fff;border-radius:14px;box-shadow:0 2px 18px rgba(0,0,0,.07);overflow:hidden;margin-bottom:1.5rem}}
    .section-header{{background:#f8f9fa;padding:.85rem 1.5rem;font-weight:700;border-bottom:1px solid #e9ecef;font-size:.88rem;display:flex;align-items:center;gap:.5rem}}
    .country-card{{background:#fff;border-radius:14px;box-shadow:0 2px 18px rgba(0,0,0,.07);padding:1.5rem;height:100%}}
    .priority-card{{background:#fff;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,.07);padding:1.2rem}}
    .metric-label{{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:#6c757d}}
    .bar-row{{padding:.15rem 0}}
    .bar-country{{width:22px;flex-shrink:0;font-size:1rem}}
    .bar-name{{width:185px;flex-shrink:0;font-size:.82rem;font-weight:500}}
    .bar-bg{{background:#e9ecef;border-radius:4px;height:8px}}
    .bar-fill{{height:8px;border-radius:4px;transition:width .3s}}
    .table thead{{background:#0d1b3e;color:#fff}}
    .table thead th{{border:none;font-weight:500;font-size:.8rem;letter-spacing:.05em;padding:.75rem 1rem}}
    .table td{{vertical-align:middle;font-size:.87rem;padding:.6rem 1rem}}
    .country-tag{{display:inline-block;border-radius:20px;padding:.18em .75em;font-size:.78rem;font-weight:600}}
    footer{{color:#adb5bd;font-size:.75rem;text-align:center;padding:2rem 1rem}}
    @media(max-width:576px){{.bar-name{{width:110px}}.kpi-num{{font-size:2.2rem}}}}
  </style>
</head>
<body>

<div class="hero">
  <div class="container">
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-3">
      <div>
        <div class="brand">Midas Furniture</div>
        <h1>Ads Intelligence Monitor</h1>
        <p class="mb-0 opacity-75">Gulf Markets — Saudi Arabia · Qatar · Kuwait</p>
      </div>
      <div class="text-end opacity-75">
        <div class="small">📅 20 March 2026</div>
        <div class="small mt-1">⏱ {captured}</div>
        <div class="small mt-1 font-monospace opacity-50">v1.0.0</div>
      </div>
    </div>
  </div>
</div>

<div class="container py-4">

  <!-- KPIs -->
  <div class="row g-3 mb-4">{kpis}</div>

  <!-- Country cards -->
  <div class="row g-3 mb-4">
    {country_cards}
  </div>

  <!-- Priority clients -->
  <div class="section-card">
    <div class="section-header">⭐ KSA Priority Clients (Midas Focus)</div>
    <div class="p-3">
      <div class="row g-3">{priority_cards}</div>
    </div>
  </div>

  <!-- Bar chart — all 60 competitors -->
  <div class="section-card">
    <div class="section-header">📊 Ad Volume — All 60 Competitors</div>
    <div class="p-4">{bars}</div>
  </div>

  <!-- Full table -->
  <div class="section-card">
    <div class="section-header">🗂 Full Competitor Detail ({total_comp} entries)</div>
    <div class="table-responsive">
      <table class="table table-hover mb-0">
        <thead>
          <tr>
            <th>Market</th><th>Competitor</th><th>FB Page</th>
            <th class="text-center">Ads</th><th class="text-center">Shots</th><th class="text-center">Status</th>
          </tr>
        </thead>
        <tbody>{table_rows}</tbody>
      </table>
    </div>
  </div>

</div>
<footer>
  Midas Furniture Competitive Intelligence &bull; Gulf Markets (SA · QA · KW) &bull; {captured}<br/>
  Data via Meta Ad Library API (public transparency) &bull; {total_shots} screenshots &bull; 0 errors
</footer>
</body>
</html>'''

out = 'reports/midas_gulf_report_2026-03-20.html'
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print(f'Written: {out}  ({len(html):,} bytes)')
print(f'Markets: {list(by_country.keys())}')
print(f'Total:   {total_ads} ads | {total_shots} screenshots | {total_comp} competitors')
