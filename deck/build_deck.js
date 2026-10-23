// Builds the readout deck from deck/data.json (all numbers come from the analysis outputs).
// Run:  node deck/build_deck.js   (from the project root)
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'));

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
pres.title = 'Analytics readout: revenue, ARPDAU and players, Jan-Apr 2026';

// ---------- palette & type
const NAVY = '0F1B33', INK = '1F2937', MUTED = '64748B', LIGHT = 'F1F5F9', LINE = 'CBD5E1';
const BLUE = '2563EB', AMBER = 'F59E0B', GREEN = '059669', RED = 'DC2626', GREY = '94A3B8';
const HF = 'Cambria', BF = 'Calibri';
const W = 13.33, M = 0.6;

const fmt = (x, d = 2) => Number(x).toFixed(d);
const pct = (x, d = 1) => `${Number(x).toFixed(d)}%`;
const usd = (x, d = 2) => `${Number(x) < 0 ? '−' : ''}$${Math.abs(Number(x)).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;

let readoutN = 0;
function header(s, kicker, title, opts = {}) {
  s.background = { color: 'FFFFFF' };
  if (kicker) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 0.38, w: opts.appendix ? 0.62 : 0.42, h: 0.42, fill: { color: opts.appendix ? GREY : NAVY }, rectRadius: 0.08, line: { color: opts.appendix ? GREY : NAVY } });
    s.addText(opts.num || '', { x: M, y: 0.38, w: opts.appendix ? 0.62 : 0.42, h: 0.42, fontFace: BF, fontSize: 13, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    s.addText(kicker.replace(/^A\d+ · /, '').toUpperCase(), { x: M + (opts.appendix ? 0.75 : 0.55), y: 0.38, w: 9, h: 0.42, fontFace: BF, fontSize: 12, bold: true, color: MUTED, charSpacing: 2, valign: 'middle', margin: 0, isTextBox: true });
  }
  s.addText(title, { x: M, y: 0.9, w: W - 2 * M, h: 0.95, fontFace: HF, fontSize: opts.titleSize || 28, bold: true, color: INK, valign: 'top', margin: 0, isTextBox: true });
}
function footer(s, text) {
  s.addText(text, { x: M, y: 7.0, w: W - 2 * M, h: 0.3, fontFace: BF, fontSize: 9.5, color: MUTED, margin: 0, isTextBox: true });
}
function body(s, runs, x, y, w, h, size = 14) {
  s.addText(runs, { x, y, w, h, fontFace: BF, fontSize: size, color: INK, valign: 'top', margin: 0, paraSpaceAfter: 6, isTextBox: true });
}
function bullets(items, size) {
  // items: string | [boldLead, rest]
  return items.map((it, i) => {
    const last = i === items.length - 1;
    if (Array.isArray(it)) return [
      { text: it[0], options: { bold: true, bullet: { indent: 14 }, fontSize: size } },
      { text: it[1], options: { breakLine: !last, fontSize: size } }];
    return [{ text: it, options: { bullet: { indent: 14 }, breakLine: !last, fontSize: size } }];
  }).flat();
}
function stat(s, x, y, w, big, label, color = NAVY, bg = LIGHT) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 1.55, fill: { color: bg }, line: { color: bg }, rectRadius: 0.1 });
  s.addText(big, { x: x + 0.25, y: y + 0.15, w: w - 0.5, h: 0.75, fontFace: HF, fontSize: 34, bold: true, color, margin: 0, valign: 'middle', isTextBox: true });
  s.addText(label, { x: x + 0.25, y: y + 0.9, w: w - 0.5, h: 0.55, fontFace: BF, fontSize: 12, color: INK, margin: 0, valign: 'top', isTextBox: true });
}
function card(s, x, y, w, h, title, text, accent = NAVY, size = 12.5) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: LIGHT }, line: { color: LIGHT }, rectRadius: 0.1 });
  s.addText(title, { x: x + 0.22, y: y + 0.16, w: w - 0.44, h: 0.4, fontFace: BF, fontSize: 14.5, bold: true, color: accent, margin: 0, valign: 'top', isTextBox: true });
  s.addText(text, { x: x + 0.22, y: y + 0.6, w: w - 0.44, h: h - 0.75, fontFace: BF, fontSize: size, color: INK, margin: 0, valign: 'top', paraSpaceAfter: 4, isTextBox: true });
}
function table(s, rows, x, y, w, colW, opts = {}) {
  const fs_ = opts.fontSize || 11;
  const data = rows.map((r, i) => r.map((c, j) => ({
    text: String(c ?? ''),
    options: {
      bold: i === 0, color: i === 0 ? 'FFFFFF' : INK, fill: { color: i === 0 ? NAVY : (i % 2 ? 'FFFFFF' : LIGHT) },
      align: j === 0 ? 'left' : (opts.alignAll || 'center'), fontSize: fs_, fontFace: BF, valign: 'middle',
    },
  })));
  s.addTable(data, { x, y, w, colW, border: { type: 'solid', pt: 0.5, color: LINE }, rowH: opts.rowH || 0.3, margin: 0.04 });
}
const chartBase = (extra) => Object.assign({
  catAxisLabelColor: MUTED, valAxisLabelColor: MUTED, catAxisLabelFontFace: BF, valAxisLabelFontFace: BF,
  catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, valGridLine: { color: 'E2E8F0', size: 0.75 }, catGridLine: { style: 'none' },
  titleFontFace: BF, titleColor: INK, titleFontSize: 13, legendFontFace: BF, legendFontSize: 11, legendColor: INK,
  dataLabelFontFace: BF, dataLabelFontSize: 10, dataLabelColor: INK,
}, extra);

// ---------- numbers
const tier = D.tier; const all = tier.find(t => t.tier === 'ALL'); const tiers = tier.filter(t => t.tier !== 'ALL');
const dec = D.decomp.find(d => d.segmentation === 'tier');
const rev1 = 29188.90, rev2 = 83647.92; // first/last 30-day gross revenue (task2 log)
const ltv = D.ltv.filter(r => r.country_tier !== null);
const ltvAll = D.ltv.find(r => r.country_tier === null);
const chd = (m, c, meth) => D.ch_diff.find(r => r.metric === m && r.comparison === c && r.method === meth);
const naive = Object.fromEntries(D.ch_naive.map(r => [r.channel, r]));
const thr = (t) => D.thr.find(r => Math.abs(r.threshold - t) < 1e-9);
const decs = D.deciles; // top first
const payersOnly = D.concentration.find(r => r.population === 'payers_only');
const allPl = D.concentration.find(r => r.population === 'all_players');
const cap5 = D.cap.find(r => r.cap === 5), cap8 = D.cap.find(r => r.cap === 8);
const ret = D.retention;
const matured30 = ret.filter(r => r.d30_pct !== null);
const wkLab = (d) => { const t = new Date(d + 'T00:00:00Z'); return t.getUTCDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][t.getUTCMonth()]; };
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const retAvg = { d1: avg(ret.filter(r => r.d1_pct !== null).map(r => r.d1_pct)), d7: avg(ret.filter(r => r.d7_pct !== null).map(r => r.d7_pct)), d30: avg(matured30.map(r => r.d30_pct)) };
const mdeRev = D.mde.find(r => r.metric === 'rev30').mde, mdeD7 = D.mde.find(r => r.metric === 'd7').mde;
const rc14 = D.return_curve.find(r => r.days_inactive === 14);

// =====================================================================
// 1. TITLE / ANSWER
// =====================================================================
{
  const s = pres.addSlide(); s.background = { color: NAVY };
  s.addText('ANALYTICS READOUT  ·  PLAYER TELEMETRY 1 JAN – 30 APR 2026', { x: M, y: 0.55, w: 11, h: 0.35, fontFace: BF, fontSize: 12, bold: true, color: 'A5B4FC', charSpacing: 2, margin: 0, isTextBox: true });
  s.addText('Revenue nearly tripled. ARPDAU fell because of who we added, not because monetisation broke.', { x: M, y: 1.1, w: 11.6, h: 1.9, fontFace: HF, fontSize: 36, bold: true, color: 'FFFFFF', margin: 0, valign: 'top', isTextBox: true });
  const cards = [
    [`${fmt(rev2 / rev1, 1)}×`, `gross revenue, last 30 days vs first 30 (${usd(rev1 / 1000, 1)}k → ${usd(rev2 / 1000, 1)}k)`, '34D399'],
    [`${fmt(all.chg_pct, 0)}%`, `blended ARPDAU (${usd(all.arpdau_first, 3)} → ${usd(all.arpdau_last, 3)})`, 'FCA5A5'],
    [`+3 to +8%`, 'ARPDAU inside every country tier over the same period', '34D399'],
    [`18% → 45%`, 'Tier 4 share of active player-days, driven by a paid_video push', 'FCD34D'],
  ];
  cards.forEach(([big, lab, col], i) => {
    const x = M + i * 3.03;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 3.35, w: 2.85, h: 1.85, fill: { color: '1E2B4A' }, line: { color: '1E2B4A' }, rectRadius: 0.1 });
    s.addText(big, { x: x + 0.22, y: 3.5, w: 2.45, h: 0.75, fontFace: HF, fontSize: 32, bold: true, color: col, margin: 0, valign: 'middle', isTextBox: true });
    s.addText(lab, { x: x + 0.22, y: 4.3, w: 2.45, h: 0.8, fontFace: BF, fontSize: 12, color: 'E2E8F0', margin: 0, valign: 'top', isTextBox: true });
  });
  s.addText([
    { text: 'The decision this feeds: ', options: { bold: true, color: 'FFFFFF' } },
    { text: 'whether the cheap Tier-4 installs we are now buying pay back. That turns on cost per install, which is not in this data, so the break-even CPI is given instead.', options: { color: 'CBD5E1' } },
  ], { x: M, y: 5.6, w: 11.8, h: 0.8, fontFace: BF, fontSize: 15, margin: 0, valign: 'top', isTextBox: true });
  s.addText('Prepared by Kevin  ·  Analytics Intern take-home  ·  Readout = slides 1–8, appendix follows', { x: M, y: 6.85, w: 11, h: 0.3, fontFace: BF, fontSize: 10.5, color: '94A3B8', margin: 0, isTextBox: true });
  s.addNotes('One-line answer first. Revenue is up ~2.9x; ARPDAU is down 16% only because the player mix shifted toward Tier 4. Every tier individually is flat or better. The budget question is Tier-4 paid_video payback, which needs CPI.');
}

// =====================================================================
// 2. HERO: SIMPSON'S PARADOX
// =====================================================================
{
  const s = pres.addSlide();
  header(s, 'Deep-dive 2(a) · ARPDAU is "down 16%"', 'Every tier earns the same or more per player. The average fell because Tier 4 grew from 18% to 45% of play.', { num: '2', titleSize: 24 });
  const labels = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'ALL'];
  const byT = (k) => [...tiers.map(t => t[k]), all[k]];
  s.addChart(pres.charts.BAR, [
    { name: 'Jan 1–30', labels, values: byT('arpdau_first') },
    { name: 'Apr 1–30', labels, values: byT('arpdau_last') },
  ], chartBase({
    x: M, y: 2.0, w: 6.4, h: 4.1, barDir: 'col', barGapWidthPct: 60, chartColors: [GREY, BLUE],
    showTitle: true, title: 'ARPDAU (USD): tiers up, total down', showLegend: true, legendPos: 't',
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '$0.00', valAxisLabelFormatCode: '$0.00', valAxisMinVal: 0,
  }));
  const tl = ['Jan 1–30', 'Apr 1–30'];
  const colors = ['1E3A8A', '3B82F6', '93C5FD', AMBER];
  s.addChart(pres.charts.BAR, tiers.map((t, i) => ({ name: `Tier ${t.tier}`, labels: tl, values: [t.share_first / 100, t.share_last / 100] })), chartBase({
    x: 7.2, y: 2.0, w: 5.5, h: 4.1, barDir: 'col', barGrouping: 'percentStacked', barGapWidthPct: 55, chartColors: colors,
    showTitle: true, title: 'Share of active player-days by tier', showLegend: true, legendPos: 'r',
    showValue: true, dataLabelPosition: 'ctr', dataLabelFormatCode: '0%', dataLabelColor: 'FFFFFF', valAxisLabelFormatCode: '0%',
  }));
  s.addText([
    { text: 'Decomposition of the −$0.058 change: ', options: { bold: true } },
    { text: `mix shift ${usd(dec.mix_effect, 3)}, within-tier ${dec.within_effect >= 0 ? '+' : ''}${usd(dec.within_effect, 3)}. ` },
    { text: 'The mix effect is bigger than the whole drop; ', options: { bold: true } },
    { text: 'within tiers, players monetise slightly better than in January. Same answer splitting by tier × platform × player age (mix = 117% of the drop).' },
  ], { x: M, y: 6.2, w: W - 2 * M, h: 0.7, fontFace: BF, fontSize: 13, color: INK, margin: 0, valign: 'top', isTextBox: true });
  footer(s, 'ARPDAU = gross IAP revenue (deduplicated, refunds excluded) / active player-days. Symmetric (Shapley) mix/rate decomposition over tiers. Source: 2a_arpdau_mix.sql, task2_arpdau.py');
  s.addNotes('This is the headline chart. Left: each tier went up between Jan and Apr, total went down 16%. Right: why, the Tier 4 share of play went from 18% to 45%. Tier 4 players are worth about a third of Tier 1 players per day, so adding lots of them pulls the average down even though nobody is spending less. Leadership asked what broke: nothing did. The metric is a ratio sensitive to mix.');
}

// =====================================================================
// 3. WHAT TO DO ABOUT IT: LTV vs CPI
// =====================================================================
{
  const s = pres.addSlide();
  header(s, 'Deep-dive 2(a) · What the business should do', 'Stop steering by blended ARPDAU. The real question is whether Tier-4 installs cost less than they return.', { num: '3', titleSize: 24 });
  const labels = ltv.map(r => `Tier ${r.country_tier}`);
  s.addChart(pres.charts.BAR, [
    { name: 'By day 30', labels, values: ltv.map(r => r.rev30) },
    { name: 'By day 90', labels, values: ltv.map(r => r.rev90) },
  ], chartBase({
    x: M, y: 2.0, w: 6.2, h: 4.2, barDir: 'col', barGapWidthPct: 55, chartColors: ['93C5FD', BLUE],
    showTitle: true, title: 'Gross revenue per install, January cohorts (USD)', showLegend: true, legendPos: 't',
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '$0.00', valAxisLabelFormatCode: '$0', valAxisMinVal: 0,
  }));
  table(s, [
    ['Tier', '90-day rev / install', 'Break-even CPI*', 'Installs Jan → Apr'],
    ...ltv.map((r, i) => [`Tier ${r.country_tier}`, usd(r.rev90), usd(r.breakeven_cpi_90d_net), `${D.installs_tier[0][String(r.country_tier)].toLocaleString()} → ${D.installs_tier[3][String(r.country_tier)].toLocaleString()}`]),
  ], 7.1, 2.05, 5.6, [0.9, 1.5, 1.45, 1.75], { fontSize: 11.5, rowH: 0.34 });
  body(s, bullets([
    ['Report ARPDAU per tier (or at a fixed tier mix) ', 'next to total revenue. A blended ratio will keep "falling" as long as we grow in cheaper markets.'],
    ['Get CPI for paid_video by tier. ', `Tier-4 installs are worth ~${usd(ltv[3].breakeven_cpi_90d_net)} over 90 days after store fees (plus ad revenue we cannot see). If they cost more, cut them. If less, they are profitable growth.`],
    ['With a fixed budget, ', `a Tier-1 install returns ${fmt(ltv[0].rev90 / ltv[3].rev90, 1)}× a Tier-4 install, so shifting spend to Tier 1 wins only if its CPI is less than ${fmt(ltv[0].rev90 / ltv[3].rev90, 1)}× Tier 4's.`],
  ], 12.5), 7.1, 4.0, 5.6, 2.8);
  footer(s, '*Break-even CPI = 90-day gross revenue × 0.70 (≈30% app-store fee), ignoring ad revenue and revenue after day 90 (day-90 ≈ 2.1× day-30, still rising). Installs 1–30 Jan, fully observed to day 90.');
  s.addNotes('Recommendation for 2a. Do not try to fix ARPDAU. Replace the KPI, and take the real decision to UA with the missing input named: CPI by channel and tier. I give the break-even CPI so the decision is ready as soon as UA supplies costs. Caveats: 90-day window, ad revenue missing (raises the break-even for all tiers, probably more for Tier 4 where ad share is higher), Jan cohorts may differ from April ones.');
}

// =====================================================================
// 4. CHANNELS
// =====================================================================
{
  const s = pres.addSlide();
  header(s, 'Question 3 · Acquisition channels', 'paid_video looks 38% worse on revenue, but that is mostly because it buys Tier 4. Like for like, channels are close.', { num: '4', titleSize: 24 });
  const chs = ['organic', 'paid_social', 'paid_video'];
  const vo = chd('rev30', 'paid_video - organic', 'naive'), va = chd('rev30', 'paid_video - organic', 'tier-adjusted');
  const so = chd('rev30', 'paid_social - organic', 'naive'), sa = chd('rev30', 'paid_social - organic', 'tier-adjusted');
  s.addChart(pres.charts.BAR, [
    { name: 'Naive gap vs organic', labels: ['paid_social', 'paid_video'], values: [so.rel_diff_pct / 100, vo.rel_diff_pct / 100] },
    { name: 'Same tier mix', labels: ['paid_social', 'paid_video'], values: [sa.rel_diff_pct / 100, va.rel_diff_pct / 100] },
  ], chartBase({
    x: M, y: 2.0, w: 5.6, h: 4.3, barDir: 'col', barGapWidthPct: 60, chartColors: [GREY, BLUE],
    showTitle: true, title: '30-day revenue per install vs organic', showLegend: true, legendPos: 't',
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0%', valAxisLabelFormatCode: '0%', valAxisMaxVal: 0.05, valAxisMinVal: -0.45,
  }));
  const r = (x, d = 2, u = '$') => (u === '$' ? `${x < 0 ? '−' : '+'}$${Math.abs(x).toFixed(d)}` : `${x < 0 ? '−' : '+'}${Math.abs(x * 100).toFixed(1)}pp`);
  const row = (m, c, u) => { const a = chd(m, c, 'tier-adjusted'); return [c.replace(' - ', ' vs '), m === 'rev30' ? '30d rev/install' : 'D7 retention', r(a.diff, 2, u), `${r(a.ci_lo, 2, u)} to ${r(a.ci_hi, 2, u)}`, a.significant ? 'Yes, borderline' : 'No']; };
  table(s, [
    ['Comparison (same tier mix)', 'Metric', 'Diff', '95% CI', 'Significant?'],
    row('rev30', 'paid_video - organic', '$'), row('rev30', 'paid_social - organic', '$'),
    row('d7_retained', 'paid_video - organic', 'pp'), row('d7_retained', 'paid_social - organic', 'pp'),
  ], 6.5, 2.05, 6.2, [1.95, 1.25, 0.8, 1.3, 0.9], { fontSize: 10.5, rowH: 0.34 });
  body(s, bullets([
    ['Artefact: ', `the naive revenue gap (−38%) is tier mix. paid_video is ${D.ch_mix.find(x => x.channel === 'paid_video')['4']}% Tier 4 vs ${D.ch_mix.find(x => x.channel === 'organic')['4']}% for organic. Like for like it shrinks to −8% and is not significant.`],
    ['Real but small: ', 'paid_video D7 retention is about 1.3pp lower within tiers. That is just significant (bootstrap p≈0.03, regression p≈0.04) and is worth about 5% of engagement, not a budget lever.'],
    ['Too small to resolve: ', `paid_social vs organic. This sample can only detect gaps of about ${usd(mdeRev)} per install (18%) or ${fmt(mdeD7 * 100, 1)}pp of D7.`],
    ['Budget: ', 'quality differences are small next to likely CPI differences, so move budget on revenue-per-install ÷ CPI by tier, not on channel "quality".'],
  ], 12), 6.5, 3.95, 6.2, 3.0);
  footer(s, `Installs 1 Jan – 31 Mar (n=${(naive.organic.n + naive.paid_social.n + naive.paid_video.n).toLocaleString()}, full 30 days observed). Same tier mix = tier-standardised means; 2,000-sample stratified bootstrap. Regression with tier, platform and month gives the same result.`);
  s.addNotes('Two traps. The naive comparison is confounded by country tier, and paid_video also skews to March, when installs spiked. After standardising to the same tier mix, the revenue gap is small and not significant. D7 is borderline. Organic is not a clean control either: it is the unattributed bucket, and linked or reinstalled devices can inherit a different channel. To call a difference real I would want a geo-holdout or incrementality test plus CPI.');
}

// =====================================================================
// 5. CHURN MODEL
// =====================================================================
{
  const s = pres.addSlide();
  header(s, 'Question 4 · Who is about to stop playing', 'A simple model finds lapsing players at 2.6× the random rate, but half of the offers in its best group would still go to players who stay.', { num: '5', titleSize: 22 });
  s.addChart(pres.charts.BAR, [{ name: 'Actual 14-day churn', labels: decs.map((d, i) => `D${i + 1}`), values: decs.map(d => d.actual) }], chartBase({
    x: M, y: 2.0, w: 6.0, h: 4.3, barDir: 'col', barGapWidthPct: 35, chartColors: [BLUE, BLUE, BLUE, '93C5FD', '93C5FD', '93C5FD', 'CBD5E1', 'CBD5E1', 'CBD5E1', 'CBD5E1'],
    showTitle: true, title: 'Actual churn by predicted-risk decile (D1 = highest), test 2–16 Apr', showLegend: false,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0%', valAxisLabelFormatCode: '0%', valAxisMinVal: 0,
  }));
  const t25 = thr(0.25), t40 = thr(0.40), t15 = thr(0.15);
  table(s, [
    ['Target if P(churn) ≥', '% of actives offered', 'Precision', 'Churners reached'],
    ...[t15, t25, t40].map(t => [fmt(t.threshold, 2), pct(t.pct_targeted, 0), pct(t.precision * 100, 0), pct(t.recall * 100, 0)]),
  ], 6.9, 2.05, 5.8, [1.6, 1.6, 1.1, 1.5], { fontSize: 11.5, rowH: 0.34 });
  body(s, bullets([
    ['Setup: ', 'players active in the last 7 days. Churn = no play in the next 14 days (base rate 18%). Trained on Jan–Mar snapshots and tested on April ones, never on shuffled rows.'],
    ['Threshold rule: ', 'offer when P(churn) × uplift × value of a retained player > offer cost. For example, a $0.50 offer with 20% uplift and a $10 player gives p ≥ 0.25: target 29% of actives and reach 57% of churners.'],
    ['Biggest caveat: ', `${pct(rc14.pct_return_within_30d, 0)} of players silent for 14 days come back within 30 days anyway. Uplift is unknown, so launch with a randomised holdout.`],
  ], 12), 6.9, 3.75, 5.8, 3.2);
  footer(s, 'Logistic regression, 8 behavioural + 3 categorical features; test AUC 0.75 (train 0.75, stable across all 3 test weeks); PR-AUC 0.38 vs 0.18 random. Weakest on payers and veteran players (AUC ≈ 0.71).');
  s.addNotes('The top-risk decile churns at 47% vs 18% overall. The strongest predictors: tenure (older accounts lapse more), level relative to tenure (progressing players stay), 28-day playtime and ad engagement. The threshold is an economics decision. I show the rule and a worked example; live-ops supplies cost and value. Because most lapsed players return on their own, the real value is in uplift, which only a holdout can measure.');
}

// =====================================================================
// 6. HEALTH: Task 1 facts
// =====================================================================
{
  const s = pres.addSlide();
  header(s, 'Baseline health · Task 1', 'Underneath the growth, the base is steady: retention is flat across cohorts, a few payers carry revenue, and the ad cap is not binding.', { num: '6', titleSize: 22 });
  const cohorts = ret.filter(r => r.d14_pct !== null);
  s.addChart(pres.charts.LINE, [
    { name: 'Day 1', labels: ret.map(r => wkLab(r.cohort_week)), values: ret.map(r => r.d1_pct === null ? null : r.d1_pct / 100) },
    { name: 'Day 7', labels: ret.map(r => wkLab(r.cohort_week)), values: ret.map(r => r.d7_pct === null ? null : r.d7_pct / 100) },
    { name: 'Day 14', labels: ret.map(r => wkLab(r.cohort_week)), values: ret.map(r => r.d14_pct === null ? null : r.d14_pct / 100) },
    { name: 'Day 30', labels: ret.map(r => wkLab(r.cohort_week)), values: ret.map(r => r.d30_pct === null ? null : r.d30_pct / 100) },
  ], chartBase({
    x: M, y: 2.0, w: 6.0, h: 4.6, chartColors: [NAVY, BLUE, '60A5FA', AMBER], lineSize: 2, lineDataSymbol: 'circle', lineDataSymbolSize: 5,
    showTitle: true, title: 'Retention by install week (cells shown only when fully observed)', showLegend: true, legendPos: 'b',
    valAxisLabelFormatCode: '0%', valAxisMinVal: 0, valAxisMaxVal: 0.6, catAxisLabelFontSize: 9, displayBlanksAs: 'gap',
  }));
  const cx = 6.95, cw = 2.8;
  card(s, cx, 2.0, cw, 2.25, 'Retention is flat', `D1 ${pct(retAvg.d1, 0)}, D7 ${pct(retAvg.d7, 0)}, D30 ${pct(retAvg.d30, 0)} in every cohort, even with 3× the installs. Players play in bursts: 62% are still active in week 5.`, NAVY);
  card(s, cx + cw + 0.2, 2.0, cw, 2.25, 'Revenue is concentrated', `Top 10% of payers = ${pct(payersOnly.top10_pct_share, 0)} of revenue. Top 1% of all players = ${pct(allPl.top1_pct_share, 0)}. Only ${pct(100 - 81.72, 0)} of Jan–Mar installs have paid, and a third of payers first pay after day 30.`, NAVY, 12);
  card(s, cx, 4.4, cw, 2.2, 'Ad cap is not binding', `Only ${pct(cap5.pct_hit_cap, 1)} of ad-days hit a cap of 5. Players given a cap of 8 watch the same amount. Raising the cap will not add views; placement will.`, NAVY, 12);
  card(s, cx + cw + 0.2, 4.4, cw, 2.2, 'iOS pays 2× Android', `ARPDAU ${usd(D.platform.find(p => p.platform === 'iOS').arpdau)} vs ${usd(D.platform.find(p => p.platform === 'Android').arpdau)}. Payer share ${pct(D.platform.find(p => p.platform === 'iOS').payer_share, 1)} vs ${pct(D.platform.find(p => p.platform === 'Android').payer_share, 1)} of active days. Android is 68% of play.`, NAVY, 12);
  footer(s, 'Retention = active on exactly day N after install. Concentration ranks payers only (11,000) and all active players (76,058) separately. Detail and SQL in appendix A1–A4.');
  s.addNotes('Task 1 in one slide. Retention not degrading means the new paid_video players are not worse at sticking, consistent with slide 4. Monetisation is slow: many first purchases come after a month, which is why 30-day value understates LTV. The ad cap question: almost nobody hits it, and the randomly assigned cap of 8 does not change behaviour, so the cap is not the constraint.');
}

// =====================================================================
// 7. DATA QUALITY
// =====================================================================
{
  const s = pres.addSlide();
  header(s, 'Before trusting any number', 'Five data problems would each have changed a headline number. Each is fixed in the SQL, not by hand.', { num: '7', titleSize: 24 });
  table(s, [
    ['Issue found', 'How I found it', 'What it would have broken', 'Handling'],
    ['ad_view clock is 8h ahead of all other tables', 'Ad events run 14:00–07:59 vs 06:00–23:59 elsewhere; after −8h, 100% of ad-days match an active day (49% before)', 'Cap-hit rate, and daily ad counts split across the wrong days', 'Shift −8h before any date logic'],
    ['No ad events on 5–6 Mar', 'Daily ad series drops to 0 while DAU is normal', 'Daily ad trend; ad features in the churn model', 'Excluded from cap analysis; flagged on chart'],
    ['122 duplicated purchase IDs', 'Same ID, player and pack, logged 3 min – 18 h apart', '+$1,816 phantom revenue and inflated repeat-purchase counts', 'Keep first occurrence'],
    ['226 refunds as negative rows', 'Negative usd_amount; 98% match an earlier purchase', 'Payer counts and conversion if refunds count as purchases', 'Gross excludes them; net (−$3,250) shown alongside'],
    ['3,211 linked devices (same person)', 'original_device_id; 2,315 player-days active on 2 devices at once', 'DAU double count; a reinstall counted as a new install', 'Collapse to one player_id; earliest install defines cohort and channel'],
    ['2,434 sale purchases ($35.5k) on days with no activity', 'All are sale_flag=1; 114 are before install', 'Payer share above 100% of actives; sale timing', 'Revenue kept; excluded from payer-share numerator; flagged'],
  ], M, 2.0, W - 2 * M, [2.6, 3.6, 3.0, 2.93], { fontSize: 10.5, rowH: 0.55, alignAll: 'left' });
  footer(s, 'Also noted: 35% of installs have no activity on install day (install ≠ first open); 228 currency_spend rows from 36 devices with impossible values (not used). Full list: appendix A5.');
  s.addNotes('I picked the issues that changed numbers. The timezone one is the subtle one: the ad table looks fine on its own, but its day boundaries are wrong. The sale purchases without activity are unexplained. My guess is an off-app store or a timestamp that is attributed to the sale window. I would ask the data engineering team before using sale timing for anything.');
}

// =====================================================================
// 8. RECOMMENDATIONS & UNCERTAINTY
// =====================================================================
{
  const s = pres.addSlide();
  header(s, 'Recommendations', 'What I would do, what I need, and what I am not sure of.', { num: '8', titleSize: 28 });
  const cols = [
    ['Do now', GREEN, [
      ['Retire blended ARPDAU ', 'as a health KPI. Track ARPDAU per tier and total revenue.'],
      ['Leave the ad cap alone; ', 'test placements instead. The cap does not bind.'],
      ['Pilot churn offers ', 'at p ≥ 0.25 with a 20% random holdout to measure real uplift.'],
    ]],
    ['Need from other teams', BLUE, [
      ['CPI by channel × tier (UA): ', `decides whether Tier-4 paid_video stays. Break-even is about ${usd(ltv[3].breakeven_cpi_90d_net)} per install.`],
      ['Ad revenue per user (Finance): ', 'raises every break-even, probably most for Tier 4.'],
      ['Explanation of sale purchases ', 'without activity (data engineering).'],
    ]],
    ['Uncertain', AMBER, [
      ['LTV beyond day 90: ', 'still rising at 90 days (2.1× day 30), so break-evens are conservative.'],
      ['Channel quality: ', 'differences under ~18% of revenue per install are invisible at this sample size.'],
      ['Offer uplift: ', `${pct(rc14.pct_return_within_30d, 0)} of 14-day lapsers return unprompted, so many offers may be wasted.`],
    ]],
  ];
  cols.forEach(([t, col, items], i) => {
    const x = M + i * 4.1, w = 3.9;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.0, w, h: 3.9, fill: { color: LIGHT }, line: { color: LIGHT }, rectRadius: 0.1 });
    s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: 2.22, w: 0.36, h: 0.36, fill: { color: col }, line: { color: col } });
    s.addText(t, { x: x + 0.75, y: 2.18, w: w - 1, h: 0.44, fontFace: BF, fontSize: 17, bold: true, color: INK, margin: 0, valign: 'middle', isTextBox: true });
    body(s, bullets(items, 13.5), x + 0.25, 2.85, w - 0.5, 3.7);
  });
  footer(s, 'Dropped for time: optional 4b (90-day value of a new install). Question 2(b) on sales was not chosen. What I would do with another week: appendix A12.');
}

// =====================================================================
// APPENDIX
// =====================================================================
function divider(title, sub) {
  const s = pres.addSlide(); s.background = { color: NAVY };
  s.addText(title, { x: M, y: 2.6, w: 11, h: 1.0, fontFace: HF, fontSize: 40, bold: true, color: 'FFFFFF', margin: 0, isTextBox: true });
  s.addText(sub, { x: M, y: 3.7, w: 11, h: 1.2, fontFace: BF, fontSize: 16, color: 'CBD5E1', margin: 0, isTextBox: true });
}
divider('Appendix', 'A1–A4 Task 1 metrics and SQL · A5 Data quality · A6–A7 Deep-dive 2(a) · A8 Channels · A9–A11 Churn model · A12 Dead ends and next week · A13 How to run the code');

// A1 daily health
{
  const s = pres.addSlide();
  header(s, 'A1 · Task 1(a) daily health', 'Daily active players and ARPDAU by platform (weekly averages shown; daily file in outputs/1a_daily_health.csv)', { num: 'A1', appendix: true, titleSize: 18 });
  const lab = D.weekly.iOS.labels;
  s.addChart(pres.charts.LINE, [
    { name: 'Android', labels: lab, values: D.weekly.Android.dau }, { name: 'iOS', labels: lab, values: D.weekly.iOS.dau }], chartBase({
    x: M, y: 1.75, w: 6.0, h: 3.0, chartColors: [AMBER, BLUE], lineSize: 2, showTitle: true, title: 'Average DAU per week', showLegend: true, legendPos: 't', catAxisLabelFontSize: 8, valAxisLabelFormatCode: '#,##0' }));
  s.addChart(pres.charts.LINE, [
    { name: 'Android', labels: lab, values: D.weekly.Android.arpdau }, { name: 'iOS', labels: lab, values: D.weekly.iOS.arpdau }], chartBase({
    x: 6.75, y: 1.75, w: 6.0, h: 3.0, chartColors: [AMBER, BLUE], lineSize: 2, showTitle: true, title: 'ARPDAU (USD), weekly (sales every ~15 days cause the swings)', showLegend: true, legendPos: 't', catAxisLabelFontSize: 8, valAxisLabelFormatCode: '$0.00' }));
  const P = (p) => D.platform.find(x => x.platform === p);
  table(s, [
    ['Window total', 'Active player-days', 'Gross revenue', 'Net of refunds', 'ARPDAU', 'Payer share of active days'],
    ...['iOS', 'Android'].map(p => [p, P(p).pdays.toLocaleString(), usd(P(p).gross, 0), usd(P(p).net, 0), usd(P(p).arpdau, 3), pct(P(p).payer_share, 2)]),
    ['Total', D.totals.pdays.toLocaleString(), usd(D.totals.gross, 0), usd(D.totals.net, 0), usd(D.totals.arpdau, 3), pct(D.totals.payer_share, 2)],
  ], M, 4.95, 7.4, [1.2, 1.3, 1.2, 1.2, 0.9, 1.6], { fontSize: 10.5 });
  body(s, bullets([
    ['Numerator/denominator: ', 'DAU from player_day, collapsed to one row per person. Revenue from deduplicated, non-refund purchases.'],
    ['Payer share ', 'counts only purchasers who are also active that day, so it cannot exceed 100%.'],
    ['Sanity check: ', `the sum of daily revenue equals the purchase_valid total (${usd(D.totals.gross, 2)}).`],
  ], 11), 8.25, 4.95, 4.5, 2.0);
  footer(s, 'SQL: sql/1a_daily_health.sql (and sql/00_setup_clean.sql for the cleaned views).');
}
// A2 retention grid
{
  const s = pres.addSlide();
  header(s, 'A2 · Task 1(b) retention cohort grid', 'Share of each install-week cohort active on day N (blank = not yet fully observed)', { num: 'A2', appendix: true, titleSize: 18 });
  const cell = (v) => v === null ? '' : pct(v, 1);
  table(s, [['Install week (Mon)', 'Players', 'D0', 'D1', 'D7', 'D14', 'D30'], ...ret.map(r => [r.cohort_week, r.cohort_size.toLocaleString(), cell(r.d0_pct), cell(r.d1_pct), cell(r.d7_pct), cell(r.d14_pct), cell(r.d30_pct)])],
    M, 1.75, 7.2, [1.7, 1.0, 0.9, 0.9, 0.9, 0.9, 0.9], { fontSize: 10, rowH: 0.27 });
  body(s, bullets([
    ['Censoring rule: ', 'a cell is shown only if every player in the cohort has reached day N by 30 Apr. A partly observed cell would include only the earliest installers, and a 0 would claim churn we have not had time to see.'],
    ['Cohorts ', 'include only 2026 installs (earlier installs have no early-life data). Linked devices are merged; a player\'s cohort is their first install.'],
    ['Day 0 is only ~65%: ', 'install_date is not first open. 35% of installs first play 1–20+ days later (DQ note).'],
    ['Intermittent play: ', 'exact-day D30 is 14%, but 62% of a cohort is active at some point in week 5 (sql/1b_weekly_retention.sql). Both are shown because they answer different questions.'],
  ], 11.5), 8.1, 1.75, 4.65, 5.0);
  footer(s, 'SQL: sql/1b_retention.sql, sql/1b_weekly_retention.sql');
}
// A3 spenders
{
  const s = pres.addSlide();
  header(s, 'A3 · Task 1(c) spender behaviour', 'Concentration, time to first purchase, and repeat-purchase gap', { num: 'A3', appendix: true, titleSize: 18 });
  table(s, [['Population ranked', 'n', 'Top 1%', 'Top 10%', 'Top 50%'],
    ...D.concentration.map(r => [r.population === 'payers_only' ? 'Payers only' : 'All active players', r.n_ranked.toLocaleString(), pct(r.top1_pct_share), pct(r.top10_pct_share), pct(r.top50_pct_share)])],
    M, 1.75, 6.0, [1.9, 1.0, 1.0, 1.0, 1.1], { fontSize: 11 });
  const fp = D.first_purchase.filter(r => !r.bucket.startsWith('0') && !r.bucket.startsWith('9'));
  const payers = fp.reduce((a, r) => a + r.players, 0);
  s.addChart(pres.charts.BAR, [{ name: 'Share of payers', labels: fp.map(r => r.bucket.slice(2)), values: fp.map(r => r.players / payers) }], chartBase({
    x: M, y: 2.85, w: 6.0, h: 3.6, barDir: 'col', chartColors: [BLUE], showTitle: true, title: `Days from install to first purchase (payers, n=${payers.toLocaleString()})`, showLegend: false,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0%', valAxisLabelFormatCode: '0%' }));
  const g = D.repeat_gap;
  body(s, bullets([
    ['Concentration: ', 'ranking payers only is the "whale" view (top 10% = 48%). Ranking everyone mostly measures conversion, because 86% of players spend $0. Both are defensible; they answer different questions.'],
    ['First purchase: ', `among Jan–Mar installs (≥30 days observed), ${pct(81.72, 1)} have not paid by 30 Apr. Only 30% of payers pay in week 1, and 33% after day 30, so 30-day LTV understates value. 66 players "paid before install" (DQ).`],
    ['Repeat gap (LAG window): ', `${g.repeat_buyers.toLocaleString()} repeat buyers, ${g.repeat_purchases.toLocaleString()} repeat purchases. Median gap ${fmt(g.median_days, 1)} days (IQR ${fmt(g.p25_days, 1)}–${fmt(g.p75_days, 1)}). That lines up with the ~15-day sale cycle, a lead for question 2(b).`],
  ], 11.5), 6.95, 1.75, 5.8, 5.1);
  footer(s, 'SQL: sql/1c_spenders.sql. Valid purchases = deduplicated, refunds excluded; linked devices merged.');
}
// A4 ads
{
  const s = pres.addSlide();
  header(s, 'A4 · Task 1(d) rewarded ads', 'Cap-hit rate by cap value, and daily completed views (outage on 5–6 Mar)', { num: 'A4', appendix: true, titleSize: 18 });
  const every = (a, k) => a.filter((_, i) => i % k === 0);
  s.addChart(pres.charts.LINE, [{ name: 'Completed views', labels: D.ads.labels, values: D.ads.completed }], chartBase({
    x: M, y: 1.75, w: 7.2, h: 3.4, chartColors: [BLUE], lineSize: 2, lineDataSymbol: 'none', showTitle: true, title: 'Completed rewarded-ad views per local day', showLegend: false, catAxisLabelFontSize: 8, valAxisLabelFormatCode: '#,##0', catAxisLabelFrequency: 14 }));
  table(s, [['Daily cap', 'Ad player-days', 'Hit cap', '% hit cap', 'Avg interactions'],
    ...D.cap.map(r => [r.cap === null ? 'All' : r.cap, r.ad_player_days.toLocaleString(), r.days_hit_cap.toLocaleString(), pct(r.pct_hit_cap, 2), fmt(r.avg_interactions, 2)])],
    M, 5.35, 7.2, [1.2, 1.6, 1.3, 1.3, 1.8], { fontSize: 11 });
  body(s, bullets([
    ['What looks off: ', 'zero ad events on 5–6 Mar while DAU is normal. That is a logging outage, not behaviour. Action: exclude those days from rates, do not interpolate them into ad revenue, and raise it with data engineering (ad-network billing for those days would confirm).'],
    ['Timezone: ', 'ad_view timestamps are 8h ahead. Without the shift, "daily" caps appear to be exceeded and half of ad-days fall on days with no activity.'],
    ['Cap is not binding: ', `${pct(cap5.pct_hit_cap, 2)} of cap-5 days hit the cap. Cap-8 days have an identical distribution up to 5 views (1.27% reach 5 in both), and caps vary by day for the same player, so this is close to a natural experiment.`],
    ['For the product team: ', 'raising the cap will not add views or ad revenue. Engagement is about 0.8 completed views per DAU, so placement and reward value are the levers.'],
  ], 11), 8.1, 1.75, 4.65, 5.2);
  footer(s, 'SQL: sql/1d_ads.sql. A player-day hits the cap when max(ad_daily_count) ≥ ad_daily_cap; the counter includes started and abandoned interactions and resets at local midnight.');
}
// A5 DQ full
{
  const s = pres.addSlide();
  header(s, 'A5 · Data quality log (full)', 'Everything found, its size, and how it is handled in sql/00_setup_clean.sql and the task scripts', { num: 'A5', appendix: true, titleSize: 18 });
  table(s, [
    ['#', 'Issue', 'Size', 'Handling'],
    ['1', 'ad_view timestamps +8h vs other tables', 'All 647,623 ad rows', 'Shift −8h; verified 100% alignment with active days and counter reset at local midnight'],
    ['2', 'Ad logging outage', '5–6 Mar local (≈07:00 5 Mar – 14:00 7 Mar raw)', 'Excluded from cap rates; shaded on chart; noted for churn ad feature'],
    ['3', 'Duplicate purchase_id', '122 rows, $1,815.82', 'ROW_NUMBER() per purchase_id, keep earliest'],
    ['4', 'Refunds as negative rows', '226 rows, −$3,249.74', 'Excluded from gross; net reported alongside; not counted as purchases'],
    ['5', 'Linked devices', '3,211 devices → 77,085 people from 80,295 devices; 112 chains of 3', 'player_id = root of chain; activity collapsed per person-day; attributes from earliest install'],
    ['6', 'Linked "original" installed later than the linked device', '1,584 of 3,211 links', 'Direction of link not trusted; earliest install used for cohort'],
    ['7', 'Sale purchases with no activity that day', '2,434 purchases, $35.5k (41% of sale purchases); 114 before install', 'Kept in revenue; excluded from payer-share numerator; sale timing treated as unreliable'],
    ['8', 'install_date ≠ first activity', '35% of 2026 installs not active on day 0; 1,014 never active', 'Kept (install is the cohort event); called out in retention'],
    ['9', 'currency_spend impossible values', '228 rows, 36 devices, up to 75.8M vs balances < 17k', 'Not used for values; only event counts used as a churn feature'],
    ['10', 'Pre-window installs (2025)', '16,000 devices', 'Excluded from cohort, first-purchase and channel analyses (left-censored)'],
  ], M, 1.75, W - 2 * M, [0.4, 3.6, 3.6, 4.53], { fontSize: 10, rowH: 0.42, alignAll: 'left' });
}
// A6 decomposition
{
  const s = pres.addSlide();
  header(s, 'A6 · Deep-dive 2(a) decomposition detail', 'The mix explanation holds under every segmentation that includes tier. Player age alone does not explain it.', { num: 'A6', appendix: true, titleSize: 18 });
  table(s, [['Segmentation', 'ARPDAU Jan', 'ARPDAU Apr', 'Change', 'Mix effect', 'Within-segment', 'Mix % of drop'],
    ...D.decomp.map(r => [r.segmentation, usd(r.arpdau_first, 4), usd(r.arpdau_last, 4), usd(r.total_change, 4), usd(r.mix_effect, 4), usd(r.within_effect, 4), pct(r.mix_share_of_drop * 100, 0)])],
    M, 1.75, 8.0, [2.0, 1.0, 1.0, 1.0, 1.0, 1.1, 0.9], { fontSize: 10.5 });
  table(s, [['Tier', 'Player-days Jan', 'Player-days Apr', 'ARPDAU Jan', 'ARPDAU Apr', 'Change'],
    ...tiers.map(t => [`Tier ${t.tier}`, t.pdays_first.toLocaleString(), t.pdays_last.toLocaleString(), usd(t.arpdau_first, 3), usd(t.arpdau_last, 3), `${t.chg_pct > 0 ? '+' : ''}${fmt(t.chg_pct, 1)}%`]),
    ['All', all.pdays_first.toLocaleString(), all.pdays_last.toLocaleString(), usd(all.arpdau_first, 3), usd(all.arpdau_last, 3), `${fmt(all.chg_pct, 1)}%`]],
    M, 3.9, 8.0, [1.2, 1.4, 1.4, 1.3, 1.3, 1.4], { fontSize: 10.5 });
  body(s, bullets([
    ['Why age alone "fails": ', 'splitting by player age shows within-age declines, but that is the same tier shift seen from another angle: new Tier-4 players fill the young-age bands.'],
    ['Where the growth came from: ', 'installs/month in Tier 4 rose 1.7k → 15.7k and paid_video 1.4k → 17.3k. Tier 1–2 installs were flat.'],
    ['Method note: ', 'tier level only, as advised. Countries are too thin for stable ARPDAU.'],
    ['Tempting wrong answer: ', '"monetisation broke". Nothing that looks at a fixed kind of player got worse.'],
  ], 11.5), 8.9, 1.75, 3.85, 5.2);
  footer(s, 'SQL: sql/2a_arpdau_mix.sql. Python: task2_arpdau.py');
}
// A7 LTV detail
{
  const s = pres.addSlide();
  header(s, 'A7 · Deep-dive 2(a) value per install', 'Revenue per install by tier. 30-day uses Jan–Mar installs; 60/90-day uses 1–30 Jan installs (fully observed).', { num: 'A7', appendix: true, titleSize: 18 });
  table(s, [['Tier', 'Installs (Jan–Mar)', '30d rev/install', '% paying by d30', 'Rev per payer (30d)'],
    ...D.val30.map(r => [`Tier ${r.country_tier}`, r.installs.toLocaleString(), usd(r.rev30_per_install, 2), pct(r.pct_pay_30d, 1), usd(r.rev_per_payer, 2)])],
    M, 1.75, 7.0, [1.0, 1.5, 1.5, 1.5, 1.5], { fontSize: 11 });
  table(s, [['Tier (Jan cohort)', 'Installs', 'd30', 'd60', 'd90', 'd90 / d30', 'Break-even CPI (net)'],
    ...D.ltv.map(r => [r.country_tier === null ? 'All' : `Tier ${r.country_tier}`, r.installs.toLocaleString(), usd(r.rev30), usd(r.rev60), usd(r.rev90), fmt(r.mult_90_30, 2) + '×', usd(r.breakeven_cpi_90d_net)])],
    M, 3.75, 9.0, [1.5, 1.1, 1.1, 1.1, 1.1, 1.3, 1.8], { fontSize: 11 });
  body(s, bullets([
    'Tier 4 converts less (7% vs 18% by day 30), but its payers spend almost as much ($15.9 vs $19.0). The gap is conversion, not wallet.',
    'Break-even excludes ad revenue (not in the data), which pushes every break-even up. It also ignores revenue after day 90, still growing about 2× from d30 to d90.',
    'Jan cohorts are mostly organic/paid_social. April Tier-4 paid_video installs may be worth less; recheck at d90 in July.',
  ], 12), M, 5.85, 12.0, 1.1);
}
// A8 channels
{
  const s = pres.addSlide();
  header(s, 'A8 · Question 3 method and full results', 'Metrics: D7 retention = active on install_date+7. Revenue = gross IAP in days 0–29. Payer = ≥1 purchase in days 0–29.', { num: 'A8', appendix: true, titleSize: 17 });
  const sig = (r) => r.significant ? 'Yes' : 'No';
  table(s, [['Metric', 'Comparison', 'Method', 'Diff', '95% CI', 'Rel.', 'Sig.'],
    ...D.ch_diff.map(r => [r.metric.replace('d7_retained', 'D7').replace('rev30', 'Rev 30d').replace('payer30', 'Payer 30d'), r.comparison, r.method,
      r.metric === 'rev30' ? usd(r.diff, 3) : fmt(r.diff * 100, 2) + 'pp', r.metric === 'rev30' ? `${usd(r.ci_lo, 2)} … ${usd(r.ci_hi, 2)}` : `${fmt(r.ci_lo * 100, 2)} … ${fmt(r.ci_hi * 100, 2)}pp`, pct(r.rel_diff_pct, 1), sig(r)])],
    M, 1.7, 8.3, [0.9, 2.1, 1.2, 0.9, 1.7, 0.8, 0.7], { fontSize: 8.5, rowH: 0.26 });
  table(s, [['Channel', 'Installs', '% Tier 4', 'D7', 'Rev 30d', 'Payer 30d'],
    ...D.ch_naive.map(r => [r.channel, r.n.toLocaleString(), pct(D.ch_mix.find(x => x.channel === r.channel)['4'], 0), pct(r.d7 * 100, 1), usd(r.rev30), pct(r.payer * 100, 1)])],
    9.1, 1.7, 3.65, [1.05, 0.65, 0.5, 0.45, 0.55, 0.45], { fontSize: 8.5, rowH: 0.3 });
  body(s, bullets([
    ['Tier-adjusted ', '= direct standardisation to the pooled tier mix. The CI comes from a 2,000-sample bootstrap resampled within tier strata. Revenue is heavy-tailed (sd $10.5), so no normal approximation.'],
    ['Cross-check: ', 'logit (D7) and robust OLS (rev) with channel + tier + platform + install month give the same picture (paid_video D7 p=0.04; rev n.s.).'],
    ['To call a gap real I would need: ', 'a geo or time-sliced holdout (organic is an unattributed bucket, not a control); consistent attribution for reinstalls and linked devices; and 90-day value, since a third of payers convert after day 30. Three comparisons × 3 metrics also raises the chance of one false positive.'],
  ], 10.5), 9.1, 3.05, 3.65, 3.9);
  footer(s, 'SQL: sql/3_channel_cohort.sql. Python: task3_channels.py. Bootstrap seed 42.');
}
// A9 churn setup
{
  const s = pres.addSlide();
  header(s, 'A9 · Question 4 setup and churn definition', 'Why "no play in the next 14 days", for whom, and as of when', { num: 'A9', appendix: true, titleSize: 18 });
  const rc = D.return_curve;
  s.addChart(pres.charts.BAR, [{ name: 'Return within 30 days', labels: rc.map(r => `${r.days_inactive}d`), values: rc.map(r => r.pct_return_within_30d / 100) }], chartBase({
    x: M, y: 1.75, w: 5.8, h: 3.9, barDir: 'col', chartColors: [BLUE], showTitle: true, title: 'After k days of silence, % who come back within the next 30 days', showLegend: false,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0%', valAxisLabelFormatCode: '0%', valAxisMinVal: 0, valAxisMaxVal: 1 }));
  body(s, bullets([
    ['Prediction: ', 'at snapshot date s (weekly, 29 Jan – 16 Apr), will a currently active player have zero active days in s+1…s+14?'],
    ['Population: ', 'players with ≥1 active day in s−6…s. Excluded: snapshots after 16 Apr (the 14-day label cannot be seen by 30 Apr), and players inactive the whole prior week (already lapsed, a different offer).'],
    ['Why 14 days: ', 'it matches the live-ops ask. A 14-day silence is unusual (only ~15% of gaps between sessions are that long), and it is long enough to lose a sale cycle. It is a lapse, not permanent churn: 85% return within a month. That is why uplift, not just prediction, decides offer value.'],
    ['Features (known at s): ', 'days since last play, active days in 7d, trend vs prior 3 weeks, log 28d playtime, level, log tenure, ever paid, log ad views 7d, tier, platform, channel.'],
    ['Split: ', 'train on snapshots 29 Jan – 19 Mar (labels end 2 Apr), test on 2/9/16 Apr. 26 Mar is skipped as a gap so no training label overlaps the test period.'],
  ], 11.5), 6.7, 1.75, 6.05, 5.2);
  footer(s, 'SQL: sql/4a_return_curve.sql, sql/4b_churn_features.sql. Base churn rate 18–20% per snapshot. Same player can appear in several snapshots, which is realistic for weekly scoring.');
}
// A10 churn results
{
  const s = pres.addSlide();
  header(s, 'A10 · Question 4 results and where it fails', 'Coefficients per standard deviation with odds ratios, and performance by segment on the April test set', { num: 'A10', appendix: true, titleSize: 18 });
  const cf = D.coef.slice(0, 11);
  table(s, [['Feature', 'Coef / SD', 'Odds ratio'], ...cf.map(r => [r.feature, fmt(r.coef_per_sd, 3), fmt(r.odds_ratio, 2)])], M, 1.7, 5.0, [2.8, 1.1, 1.1], { fontSize: 10, rowH: 0.29 });
  const segs = D.segments.filter(r => ['new_player=0', 'new_player=1', 'payer_ever=0', 'payer_ever=1', 'country_tier=1', 'country_tier=4', 'platform=Android', 'platform=iOS'].includes(r.seg));
  table(s, [['Segment', 'n', 'Churn rate', 'AUC'], ...segs.map(r => [r.seg, Math.round(r.n).toLocaleString(), pct(r.churn_rate * 100, 1), fmt(r.auc, 3)])], 5.9, 1.7, 3.6, [1.5, 0.8, 0.7, 0.6], { fontSize: 10, rowH: 0.29 });
  body(s, bullets([
    ['Overall: ', 'AUC 0.747 test vs 0.752 train (no overfit), PR-AUC 0.38 vs 0.18 base. Calibrated: predicted and actual match within 5pp in every decile.'],
    ['Reading it: ', 'tenure is the strongest signal (old accounts lapse more; new players churn only 6%). At a given tenure, a higher level and more playtime and ad views mean lower risk.'],
    ['Fails where: ', 'within a segment the ranking weakens (AUC ≈ 0.70–0.71 for veterans, new players and payers). A lot of the power comes from separating those groups. Precision tops out near 50%.'],
    ['Not used: ', 'a 15-feature version scored 0.754 but its coefficients flip sign from collinearity. Not worth 0.007 AUC.'],
  ], 11), 9.75, 1.7, 3.0, 5.3);
  footer(s, 'Python: task4_churn.py (scikit-learn LogisticRegression, standardised numerics, one-hot categoricals).');
}
// A11 thresholds & economics
{
  const s = pres.addSlide();
  header(s, 'A11 · Question 4 thresholds and offer economics', 'Target when P(churn) × uplift × V > cost, which gives threshold = cost ÷ (uplift × V). Numbers per the April test set.', { num: 'A11', appendix: true, titleSize: 17 });
  table(s, [['Threshold', '% targeted', 'Precision', 'Recall', 'Wasted offers / 1,000 actives'],
    ...D.thr.map(r => [fmt(r.threshold, 2), pct(r.pct_targeted, 1), pct(r.precision * 100, 1), pct(r.recall * 100, 1), Math.round(r.wasted_per_1000)])],
    M, 1.75, 6.2, [1.0, 1.1, 1.1, 1.0, 2.0], { fontSize: 10.5 });
  const ec = D.econ.filter(r => r.pct_targeted > 0);
  table(s, [['Value V', 'Offer cost', 'Uplift', 'Threshold', '% targeted', 'Precision'],
    ...ec.map(r => [usd(r.value_retained_player, 0), usd(r.offer_cost), pct(r.uplift * 100, 0), fmt(r.threshold, 2), pct(r.pct_targeted, 0), r.precision === null ? '' : pct(r.precision * 100, 0)])],
    7.1, 1.75, 5.65, [0.9, 0.95, 0.8, 0.95, 1.05, 1.0], { fontSize: 10, rowH: 0.28 });
  body(s, bullets([
    'Scenarios not shown in the right table target nobody: the offer costs more than its expected value even for the riskiest player. For example, a $1 offer is never worth it for a $5 player at 20% uplift.',
    'Value V should be the incremental revenue from 14 days kept, not LTV. That is small for non-payers, so in practice only high-value (payer or Tier 1) segments justify paid offers. Cheap non-monetary nudges (push, free currency) work for everyone.',
    'Uplift is the unknown that matters most. With 85% natural return, measure it with a randomised holdout before scaling.',
  ], 11.5), M, 4.9, 6.2, 2.1);
  footer(s, 'outputs/4_thresholds.csv, outputs/4_economics.csv');
}
// A12 dead ends & next week
{
  const s = pres.addSlide();
  header(s, 'A12 · Dead ends, what I dropped, and what I would do next', 'Triage followed the brief\'s order: 1, 2, 5, then 3, then 4. Question 4b was dropped.', { num: 'A12', appendix: true, titleSize: 18 });
  card(s, M, 1.75, 3.9, 4.2, 'Dead ends', 'Player age as the driver of the ARPDAU drop: within-age ARPDAU falls, but that is the tier shift in disguise (new Tier-4 players fill the young bands).\n\nPer-country ARPDAU: too noisy, as the brief warned. Dropped for tier.\n\nExact-day retention as the churn signal: misleading for bursty players. Switched to a 7-day activity window.\n\nA 15-feature churn model: +0.007 AUC, but uninterpretable.', NAVY, 12);
  card(s, M + 4.1, 1.75, 3.9, 4.2, 'Dropped / not done', '4b (90-day value of a new install): dropped. Only Jan installs have 90 days of labels, which is too small and not representative of the April paid_video mix.\n\n2(b) sales: not chosen, but there are leads. Purchases dip in the ~4 days before each sale, and the median repeat gap (15 days) matches the sale cycle. That is consistent with Finance\'s "waiting" view.', AMBER, 12);
  card(s, M + 8.2, 1.75, 3.93, 4.2, 'With another week', 'Get CPI and ad revenue, then compute ROAS by channel × tier.\n\nReport ARPDAU at a fixed Jan tier mix every week.\n\nSales: an event study of purchases around each sale and pre-sale dip, then propose a sale-frequency A/B by region.\n\nChurn: a holdout pilot, uplift modelling, and a survival model instead of a fixed 14-day label.\n\nSettle with data engineering the sale purchases without activity and the linked-device direction.', GREEN, 12);
}
// A13 code
{
  const s = pres.addSlide();
  header(s, 'A13 · How to run the code', 'Python 3.11 + DuckDB (SQL straight on the CSVs). Everything regenerates from csv/ in about 2 minutes.', { num: 'A13', appendix: true, titleSize: 18 });
  table(s, [['File', 'What it does'],
    ['sql/00_setup_clean.sql', 'Raw views, device→player map, cleaned activity, purchases (dedup, refunds), ad_view shifted −8h'],
    ['sql/1a…1d_*.sql + task1_run.py', 'Task 1 metrics → outputs/1*.csv, charts/1*.png'],
    ['sql/2a_arpdau_mix.sql + task2_arpdau.py', 'Tier and age mix decomposition, value per install, LTV by tier'],
    ['sql/3_channel_cohort.sql + task3_channels.py', 'Channel cohort table, naive and tier-adjusted differences, bootstrap CIs, regression, MDE'],
    ['sql/4a,4b_*.sql + task4_churn.py', 'Return curve, snapshot feature table, logistic model, thresholds, economics'],
    ['deck_data.py + deck/build_deck.js', 'Collects outputs into deck/data.json and builds this deck (every number is traceable)'],
    ['run_all.sh', 'pip install -r requirements.txt; runs everything in order'],
  ], M, 1.75, W - 2 * M, [4.3, 7.83], { fontSize: 11.5, rowH: 0.42, alignAll: 'left' });
  body(s, [{ text: 'Put the five CSVs in ./csv/ (or edit the path in sql/00_setup_clean.sql), then run  bash run_all.sh', options: { fontFace: 'Courier New', fontSize: 12 } }], M, 5.5, 12, 0.5);
}

pres.writeFile({ fileName: path.join(__dirname, '..', 'EA_Analytics_Intern_Readout_Kevin.pptx') }).then(f => console.log('wrote', f));
