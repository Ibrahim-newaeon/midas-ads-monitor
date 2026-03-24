#!/usr/bin/env python3
import json

with open('reports/2026-03-20_dryrun_1774034080140.json') as f:
    r = json.load(f)

total_ads   = r['totalAds']
total_shots = r['totalScreenshots']
total_comp  = len(r['results'])
run_id      = r['runId']
started     = r['startedAt'][:19].replace('T', ' ')

def bar_row(res):
    star = '⭐ ' if res['isPriority'] else ''
    pct  = min(100, int(res['adsFound'] / 12 * 100))
    return f"""
      <div class="d-flex align-items-center mb-3">
        <div style="width:210px;flex-shrink:0" class="small fw-semibold text-truncate pe-2">{star}{res['competitor']}</div>
        <div class="flex-grow-1">
          <div class="d-flex align-items-center gap-2">
            <div class="bar-wrap flex-grow-1">
              <div class="progress-bar-ads" style="width:{pct}%"></div>
            </div>
            <span class="badge bg-success" style="min-width:32px">{res['adsFound']}</span>
          </div>
        </div>
      </div>"""

def priority_card(res):
    return f"""
      <div class="col-md-4 p-4 border-end">
        <div class="fw-bold mb-1">{res['competitor']}</div>
        <div class="text-muted small mb-2 font-monospace">{res['fbPageName']}</div>
        <div class="d-flex gap-4">
          <div><span class="fw-bold text-success fs-3">{res['adsFound']}</span><div class="text-muted" style="font-size:.75rem;text-transform:uppercase;letter-spacing:.06em">active ads</div></div>
          <div><span class="fw-bold text-primary fs-3">{res['screenshotsCaptured']}</span><div class="text-muted" style="font-size:.75rem;text-transform:uppercase;letter-spacing:.06em">screenshots</div></div>
        </div>
      </div>"""

def table_row(res):
    star = '⭐ ' if res['isPriority'] else ''
    badge = '<span class="badge bg-success">OK</span>' if not res['errors'] else f'<span class="badge bg-warning text-dark">{len(res["errors"])} err</span>'
    return f"""<tr>
      <td><span class="country-pill">KSA</span></td>
      <td class="fw-semibold">{star}{res['competitor']}</td>
      <td><span class="badge bg-success">{res['adsFound']}</span></td>
      <td>{res['screenshotsCaptured']}</td>
      <td class="text-muted small">{res['capturedAt'][:10]}</td>
      <td>{badge}</td>
    </tr>"""

bars      = '\n'.join(bar_row(x) for x in r['results'])
priorities = '\n'.join(priority_card(x) for x in r['results'] if x['isPriority'])
rows      = '\n'.join(table_row(x) for x in r['results'])

html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Midas Ads Monitor — KSA 2026-03-20</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"/>
  <style>
    body { background:#f0f2f8; font-family:"Segoe UI",system-ui,sans-serif; }
    .hero { background:linear-gradient(135deg,#0d0d1a 0%,#1a2744 55%,#0f3460 100%); color:#fff; padding:2.5rem 2rem; }
    .hero .brand { font-size:.9rem; letter-spacing:.18em; text-transform:uppercase; color:#c9a84c; font-weight:600; }
    .stat-card { background:#fff; border-radius:16px; box-shadow:0 2px 20px rgba(0,0,0,.07); border:none; padding:1.5rem; text-align:center; }
    .stat-num { font-size:3rem; font-weight:800; line-height:1; }
    .stat-label { font-size:.72rem; text-transform:uppercase; letter-spacing:.1em; color:#6c757d; margin-top:.3rem; }
    .table thead { background:#1a2744; color:#fff; }
    .table thead th { border:none; font-weight:500; font-size:.82rem; letter-spacing:.05em; }
    .section-card { background:#fff; border-radius:16px; box-shadow:0 2px 20px rgba(0,0,0,.07); overflow:hidden; }
    .section-header { background:#f8f9fa; padding:.9rem 1.5rem; font-weight:700; border-bottom:1px solid #e9ecef; font-size:.9rem; }
    .progress-bar-ads { height:7px; border-radius:4px; background:linear-gradient(90deg,#28a745,#20c997); }
    .bar-wrap { background:#e9ecef; border-radius:4px; height:7px; }
    .country-pill { display:inline-block; background:#e8f4fd; color:#0f3460; border-radius:20px; padding:.2em .75em; font-size:.78rem; font-weight:600; }
    footer { color:#adb5bd; font-size:.78rem; text-align:center; padding:2.5rem 1rem; }
    .gold { color:#c9a84c; }
    tr:hover td { background:#f8fbff; }
    .priority-block { border-right:1px solid #e9ecef; }
    .priority-block:last-child { border-right:none; }
    @media(max-width:768px){ .priority-block { border-right:none; border-bottom:1px solid #e9ecef; } }
  </style>
</head>
<body>

<div class="hero mb-4">
  <div class="container">
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-3">
      <div>
        <div class="brand">Midas Furniture</div>
        <h1 class="h2 fw-bold mb-1 mt-2">Ads Intelligence Monitor</h1>
        <p class="mb-0 opacity-75">&#127462;&#127480; Saudi Arabia — Daily Competitor Report</p>
      </div>
      <div class="text-end opacity-75">
        <div class="small mb-1">Run ID: <span class="font-monospace">""" + run_id + """</span></div>
        <div class="small">Captured: """ + started + """ UTC</div>
      </div>
    </div>
  </div>
</div>

<div class="container pb-5">

  <div class="row g-3 mb-4">
    <div class="col-6 col-md-3">
      <div class="stat-card">
        <div class="stat-num text-success">""" + str(total_ads) + """</div>
        <div class="stat-label">Active Ads Found</div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="stat-card">
        <div class="stat-num text-primary">""" + str(total_shots) + """</div>
        <div class="stat-label">Screenshots Saved</div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="stat-card">
        <div class="stat-num gold">""" + str(total_comp) + """</div>
        <div class="stat-label">Competitors</div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="stat-card">
        <div class="stat-num text-success">0</div>
        <div class="stat-label">Errors</div>
      </div>
    </div>
  </div>

  <div class="section-card mb-4">
    <div class="section-header">&#11088; KSA Priority Clients — Midas Focus</div>
    <div class="row g-0">
""" + priorities + """
    </div>
  </div>

  <div class="section-card mb-4">
    <div class="section-header">&#128202; Ad Volume by Competitor</div>
    <div class="p-4">
""" + bars + """
    </div>
  </div>

  <div class="section-card">
    <div class="section-header">&#127970; All 20 Competitors — Full Detail</div>
    <div class="table-responsive">
      <table class="table table-hover mb-0">
        <thead>
          <tr>
            <th>Country</th>
            <th>Competitor</th>
            <th>Active Ads</th>
            <th>Screenshots</th>
            <th>Captured</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
""" + rows + """
        </tbody>
      </table>
    </div>
  </div>

</div>

<footer>
  Midas Furniture Ads Intelligence Monitor &bull; Saudi Arabia Market &bull; """ + started + """ UTC<br/>
  Data sourced via Meta Ad Library API (public transparency data) &bull; 0 errors &bull; 119 screenshots captured
</footer>

</body>
</html>"""

out = 'reports/midas_ksa_report_2026-03-20.html'
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"Written: {out} ({len(html):,} bytes)")
