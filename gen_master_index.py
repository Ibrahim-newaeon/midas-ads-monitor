#!/usr/bin/env python3
"""
gen_master_index.py
Scans all JSON reports, groups by date (newest first),
and builds one self-contained index.html.
Run after every daily agent job.
"""
import json, glob, os
from datetime import datetime
from pathlib import Path

REPORTS_DIR   = Path('reports')
SCREENSHOTS   = Path('screenshots')
OUT           = REPORTS_DIR / 'index.html'

FLAG  = {'KSA': '🇸🇦', 'Qatar': '🇶🇦', 'Kuwait': '🇰🇼'}
COLOR = {'KSA': '#006C35', 'Qatar': '#8D1B3D', 'Kuwait': '#007A3D'}
LABEL = {'KSA': 'Saudi Arabia', 'Qatar': 'Qatar', 'Kuwait': 'Kuwait'}

# ── 1. Aggregate all JSON runs by date ───────────────────────────────────────

raw = {}
for f in sorted(glob.glob(str(REPORTS_DIR / '*.json')), reverse=True):
    try:
        with open(f) as fh:
            r = json.load(fh)
    except Exception:
        continue
    date = r.get('startedAt', '')[:10]
    if not date:
        continue
    if date not in raw:
        raw[date] = {'results': [], 'byCountry': {}, 'runIds': [], 'errors': 0}
    raw[date]['results'].extend(r.get('results', []))
    raw[date]['byCountry'].update(r.get('byCountry', {}))
    raw[date]['runIds'].append(r.get('runId', ''))
    raw[date]['errors'] += r.get('totalErrors', 0)

# Sort dates newest → oldest
days = dict(sorted(raw.items(), reverse=True))

# ── 2. Helpers ────────────────────────────────────────────────────────────────

def fmt_date(d):
    try:
        return datetime.strptime(d, '%Y-%m-%d').strftime('%d %b %Y')
    except:
        return d

def is_today(d):
    return d == datetime.now().strftime('%Y-%m-%d')

def report_link(date, country):
    """Find matching gulf or country HTML report for a date."""
    gulf = REPORTS_DIR / f'midas_gulf_report_{date}.html'
    ctry = REPORTS_DIR / f'midas_{country.lower()}_report_{date}.html'
    if gulf.exists():
        return f'midas_gulf_report_{date}.html'
    if ctry.exists():
        return f'midas_{country.lower()}_report_{date}.html'
    return None

def screenshot_count(date, country):
    p = SCREENSHOTS / country / date
    if not p.exists():
        return 0
    return len(list(p.glob('**/*.png')))

# ── 3. Build sidebar date list ────────────────────────────────────────────────

sidebar_items = ''
for i, (date, data) in enumerate(days.items()):
    total_shots = sum(screenshot_count(date, c) for c in data['byCountry'])
    total_ads   = sum(s['adsFound'] for s in data['byCountry'].values())
    today_badge = '<span class="today-badge">TODAY</span>' if is_today(date) else ''
    active      = 'active' if i == 0 else ''
    countries_flags = ''.join(FLAG.get(c,'') for c in sorted(data['byCountry']))
    sidebar_items += f'''
    <div class="date-item {active}" onclick="showDay('{date}')" id="nav-{date}">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="date-label">{today_badge}{fmt_date(date)}</div>
          <div class="date-meta">{countries_flags} {len(data["byCountry"])} markets · {total_ads} ads</div>
        </div>
        <div class="date-shots">{total_shots}<div style="font-size:.6rem;opacity:.6">shots</div></div>
      </div>
    </div>'''

# ── 4. Build day panels ───────────────────────────────────────────────────────

def country_card(date, country, stats):
    col   = COLOR.get(country, '#555')
    flag  = FLAG.get(country, '')
    label = LABEL.get(country, country)
    shots = screenshot_count(date, country)
    link  = report_link(date, country)
    btn   = f'<a href="{link}" class="report-btn" target="_blank">View Report →</a>' if link else '<span style="opacity:.4;font-size:.78rem">No report file</span>'
    return f'''
    <div class="col-md-4">
      <div class="c-card" style="border-top:3px solid {col}">
        <div class="d-flex align-items-center gap-2 mb-3">
          <span style="font-size:1.8rem">{flag}</span>
          <div>
            <div class="fw-bold">{label}</div>
            <div style="font-size:.75rem;color:#999">{stats["competitors"]} competitors</div>
          </div>
        </div>
        <div class="d-flex gap-4 mb-3">
          <div><div class="big-num" style="color:{col}">{stats["adsFound"]}</div><div class="num-label">active ads</div></div>
          <div><div class="big-num text-primary">{shots}</div><div class="num-label">screenshots</div></div>
        </div>
        {btn}
      </div>
    </div>'''

def competitor_rows(date, results):
    rows = ''
    for r in results:
        flag  = FLAG.get(r['country'], '')
        col   = COLOR.get(r['country'], '#555')
        star  = '⭐ ' if r.get('isPriority') else ''
        shots = screenshot_count(date, r['country'])  # rough
        ok    = '<span class="badge bg-success" style="font-size:.65rem">✓</span>' if not r['errors'] else f'<span class="badge bg-warning text-dark" style="font-size:.65rem">⚠</span>'
        rows += f'''<tr>
          <td><span style="font-size:.9rem">{flag}</span></td>
          <td class="fw-semibold" style="font-size:.83rem">{star}{r["competitor"]}</td>
          <td class="text-center"><span class="badge" style="background:{col};font-size:.7rem">{r["adsFound"]}</span></td>
          <td class="text-center" style="font-size:.82rem;color:#0d6efd">{r["screenshotsCaptured"]}</td>
          <td class="text-center">{ok}</td>
        </tr>'''
    return rows

day_panels = ''
for i, (date, data) in enumerate(days.items()):
    display    = 'block' if i == 0 else 'none'
    today_tag  = '<span class="badge bg-warning text-dark ms-2" style="font-size:.7rem">TODAY</span>' if is_today(date) else ''
    total_ads  = sum(s['adsFound'] for s in data['byCountry'].values())
    total_comp = len(data['results'])
    total_shots= sum(screenshot_count(date, c) for c in data['byCountry'])
    total_err  = data['errors']
    gulf_link  = report_link(date, 'gulf') or report_link(date, 'KSA')
    gulf_btn   = f'<a href="{gulf_link}" class="gulf-btn" target="_blank">Open Full Gulf Report →</a>' if gulf_link else ''

    c_cards = ''.join(country_card(date, c, s) for c, s in sorted(data['byCountry'].items()))
    t_rows  = competitor_rows(date, data['results'])

    day_panels += f'''
    <div class="day-panel" id="day-{date}" style="display:{display}">

      <!-- Day header -->
      <div class="day-header">
        <div>
          <h2 class="h4 fw-bold mb-1">{fmt_date(date)}{today_tag}</h2>
          <div class="text-muted small">Gulf Markets Intelligence Run</div>
        </div>
        <div>{gulf_btn}</div>
      </div>

      <!-- KPIs -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-n text-success">{total_ads}</div><div class="kpi-l">Active Ads</div></div></div>
        <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-n text-primary">{total_shots}</div><div class="kpi-l">Screenshots</div></div></div>
        <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-n" style="color:#c9a84c">{total_comp}</div><div class="kpi-l">Competitors</div></div></div>
        <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-n {'text-success' if total_err==0 else 'text-danger'}">{total_err}</div><div class="kpi-l">Errors</div></div></div>
      </div>

      <!-- Country cards -->
      <div class="row g-3 mb-4">{c_cards}</div>

      <!-- Competitor table -->
      <div class="sec-card">
        <div class="sec-head">🏢 All {total_comp} Competitors</div>
        <div class="table-responsive">
          <table class="table table-hover table-sm mb-0" style="font-size:.84rem">
            <thead style="background:#0d1b3e;color:#fff">
              <tr><th></th><th>Competitor</th><th class="text-center">Ads</th><th class="text-center">Shots</th><th class="text-center">OK</th></tr>
            </thead>
            <tbody>{t_rows}</tbody>
          </table>
        </div>
      </div>

    </div>'''

# ── 5. Grand totals across all days ───────────────────────────────────────────

all_days      = len(days)
grand_ads     = sum(sum(s['adsFound'] for s in d['byCountry'].values()) for d in days.values())
grand_shots   = sum(sum(screenshot_count(dt, c) for c in d['byCountry']) for dt, d in days.items())
first_date    = min(days.keys()) if days else '—'
last_date     = max(days.keys()) if days else '—'

# ── 6. Assemble final HTML ────────────────────────────────────────────────────

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Midas Ads Monitor — Archive</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"/>
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{background:#0d0f18;font-family:"Segoe UI",system-ui,sans-serif;color:#e8eaf0;min-height:100vh;display:flex;flex-direction:column}}

    /* ── Topbar ── */
    .topbar{{background:linear-gradient(90deg,#090c1a 0%,#0f1e3d 50%,#0a1628 100%);padding:.85rem 1.5rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1e2d4d;position:sticky;top:0;z-index:100}}
    .brand{{display:flex;align-items:center;gap:.75rem}}
    .brand-icon{{width:36px;height:36px;background:linear-gradient(135deg,#c9a84c,#e6c96a);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.1rem}}
    .brand-name{{font-weight:800;font-size:1rem;letter-spacing:.02em}}
    .brand-sub{{font-size:.72rem;color:#c9a84c;letter-spacing:.12em;text-transform:uppercase}}
    .topbar-stats{{display:flex;gap:1.5rem}}
    .tstat{{text-align:center}}
    .tstat-n{{font-weight:700;font-size:1.1rem;color:#c9a84c}}
    .tstat-l{{font-size:.65rem;text-transform:uppercase;letter-spacing:.08em;color:#6b7fa3}}

    /* ── Layout ── */
    .main-wrap{{display:flex;flex:1;overflow:hidden}}

    /* ── Sidebar ── */
    .sidebar{{width:230px;flex-shrink:0;background:#080b16;border-right:1px solid #1a2540;overflow-y:auto;height:calc(100vh - 57px);position:sticky;top:57px}}
    .sidebar-head{{padding:.85rem 1rem .5rem;font-size:.68rem;text-transform:uppercase;letter-spacing:.14em;color:#4a5a7a;font-weight:700}}
    .date-item{{padding:.75rem 1rem;cursor:pointer;border-bottom:1px solid #111827;transition:background .15s}}
    .date-item:hover{{background:#0f172a}}
    .date-item.active{{background:linear-gradient(90deg,#0f2346,#091830);border-left:3px solid #c9a84c}}
    .date-label{{font-size:.84rem;font-weight:600;color:#d0d8f0}}
    .date-meta{{font-size:.68rem;color:#4a5a7a;margin-top:.15rem}}
    .date-shots{{font-size:1.1rem;font-weight:700;color:#c9a84c;text-align:right}}
    .today-badge{{background:#c9a84c;color:#000;font-size:.6rem;font-weight:800;padding:.1em .45em;border-radius:4px;margin-right:.35rem;text-transform:uppercase;letter-spacing:.06em}}

    /* ── Content ── */
    .content-area{{flex:1;overflow-y:auto;padding:1.75rem;height:calc(100vh - 57px)}}

    /* ── Day panel ── */
    .day-header{{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid #1a2540}}
    .gulf-btn{{background:linear-gradient(135deg,#c9a84c,#e0b93a);color:#000;padding:.4rem 1rem;border-radius:8px;font-weight:700;font-size:.82rem;text-decoration:none;white-space:nowrap}}
    .gulf-btn:hover{{filter:brightness(1.1);color:#000}}

    /* ── KPI ── */
    .kpi-card{{background:#0f172a;border:1px solid #1a2540;border-radius:12px;padding:1.1rem;text-align:center}}
    .kpi-n{{font-size:2.4rem;font-weight:800;line-height:1}}
    .kpi-l{{font-size:.68rem;text-transform:uppercase;letter-spacing:.1em;color:#4a5a7a;margin-top:.25rem}}

    /* ── Country cards ── */
    .c-card{{background:#0f172a;border:1px solid #1a2540;border-radius:12px;padding:1.25rem;height:100%}}
    .big-num{{font-size:2rem;font-weight:800;line-height:1}}
    .num-label{{font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;color:#4a5a7a}}
    .report-btn{{display:inline-block;margin-top:.25rem;background:#1e3a5f;color:#7eb3f5;padding:.3rem .85rem;border-radius:6px;font-size:.78rem;font-weight:600;text-decoration:none;border:1px solid #2a4d7a}}
    .report-btn:hover{{background:#254b7a;color:#9ecaff}}

    /* ── Section cards ── */
    .sec-card{{background:#0f172a;border:1px solid #1a2540;border-radius:12px;overflow:hidden;margin-bottom:1.25rem}}
    .sec-head{{padding:.75rem 1.25rem;background:#0a1022;font-weight:700;font-size:.85rem;border-bottom:1px solid #1a2540;color:#c9d0e8}}

    /* ── Table ── */
    .table{{color:#c9d0e8}}
    .table-hover tbody tr:hover td{{background:#151f38}}
    .table td,.table th{{border-color:#1a2540;padding:.45rem .75rem}}

    /* ── Empty state ── */
    .empty-state{{text-align:center;padding:4rem 2rem;color:#4a5a7a}}
    .empty-state .icon{{font-size:3rem;margin-bottom:1rem}}

    /* ── Responsive ── */
    @media(max-width:768px){{
      .sidebar{{width:100%;height:auto;position:relative;top:0;border-right:none;border-bottom:1px solid #1a2540;display:flex;overflow-x:auto;flex-direction:row}}
      .main-wrap{{flex-direction:column}}
      .sidebar-head{{display:none}}
      .date-item{{min-width:140px;border-bottom:none;border-right:1px solid #111827}}
      .date-item.active{{border-left:none;border-bottom:3px solid #c9a84c}}
      .content-area{{height:auto;overflow:visible}}
      .topbar-stats{{display:none}}
    }}
  </style>
</head>
<body>

<!-- ── Topbar ─────────────────────────────────────────────────────────────── -->
<div class="topbar">
  <div class="brand">
    <div class="brand-icon">🪑</div>
    <div>
      <div class="brand-name">Midas Furniture</div>
      <div class="brand-sub">Ads Intelligence Archive</div>
    </div>
  </div>
  <div class="topbar-stats">
    <div class="tstat"><div class="tstat-n">{all_days}</div><div class="tstat-l">Days</div></div>
    <div class="tstat"><div class="tstat-n">{grand_ads}</div><div class="tstat-l">Total Ads</div></div>
    <div class="tstat"><div class="tstat-n">{grand_shots}</div><div class="tstat-l">Screenshots</div></div>
    <div class="tstat"><div class="tstat-n">3</div><div class="tstat-l">Markets</div></div>
  </div>
</div>

<!-- ── Body ──────────────────────────────────────────────────────────────── -->
<div class="main-wrap">

  <!-- Sidebar -->
  <div class="sidebar">
    <div class="sidebar-head">📅 Daily Runs</div>
    {sidebar_items}
    <div style="padding:.5rem 1rem .75rem;font-size:.65rem;color:#2a3a5a;text-align:center">
      {first_date} → {last_date}
    </div>
  </div>

  <!-- Main content -->
  <div class="content-area" id="content">
    {day_panels if day_panels else '<div class="empty-state"><div class="icon">📭</div><div>No reports yet.<br>Run the agent to generate your first report.</div></div>'}
  </div>

</div>

<script>
  function showDay(date) {{
    // Hide all panels
    document.querySelectorAll('.day-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.date-item').forEach(n => n.classList.remove('active'));

    // Show selected
    const panel = document.getElementById('day-' + date);
    const nav   = document.getElementById('nav-'  + date);
    if (panel) panel.style.display = 'block';
    if (nav)   nav.classList.add('active');

    // Scroll content to top on mobile
    document.getElementById('content').scrollTop = 0;
  }}
</script>

</body>
</html>'''

OUT.write_text(html, encoding='utf-8')
print(f'Written: {OUT}  ({len(html):,} bytes)')
print(f'Days indexed: {all_days}')
print(f'Grand total: {grand_ads} ads · {grand_shots} screenshots')

# ── Auto-push to GitHub (triggers Pages redeploy) ────────────────────────────
import subprocess, os

def git_push():
    try:
        today = datetime.now().strftime('%Y-%m-%d')
        subprocess.run(['git', 'add', 'reports/index.html', 'reports/', 'index.html'],
                       check=True, capture_output=True)
        result = subprocess.run(
            ['git', 'commit', '-m', f'📊 Daily run {today} — {grand_ads} ads · {grand_shots} screenshots'],
            capture_output=True, text=True)
        if result.returncode == 0:
            subprocess.run(['git', 'push', 'origin', 'main'], check=True, capture_output=True)
            print(f'✓ Pushed to GitHub → Pages rebuilding')
        else:
            print('  No changes to commit')
    except Exception as e:
        print(f'  Git push skipped: {e}')

if os.path.exists('.git'):
    git_push()
