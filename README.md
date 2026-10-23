# Analytics Intern take-home: Kevin

**Deck:** `EA_Analytics_Intern_Readout_Kevin.pptx` (slides 1–8 are the readout; the appendix follows)

## Headline findings
- **2(a) ARPDAU "down 16%":** nothing broke. ARPDAU rose in every country tier (+3% to +8%), but Tier 4's share of active player-days grew from 18% to 45% because of a paid_video install push. The mix effect (−$0.076) is larger than the whole drop (−$0.058). Gross revenue rose 2.9×. The real decision is Tier-4 CPI against a break-even of about $1.64 per install (90-day revenue after store fees).
- **3 Channels:** the naive −38% revenue gap for paid_video is an artefact of tier mix. Like for like it is −8% and not significant. The paid_video D7 gap (−1.3pp) is borderline and small. paid_social vs organic is below what this sample can detect.
- **4 Churn:** logistic regression with a time-based split. Test AUC 0.75, and the top decile churns at 2.6× the base rate. The offer threshold equals cost ÷ (uplift × value). 85% of players who go silent for 14 days return within 30 days anyway, so uplift has to be measured with a holdout.

## How to run

> **Data not included.** The five raw CSVs (player_profile, player_day, purchase, currency_spend, ad_view) belong to EA and are not in this repo. Put them in a `csv/` folder next to `run_sql.py` to reproduce every output. The two player-level output files (`outputs/3_channel_cohort.csv`, `outputs/4_test_predictions.csv`) are also left out; `run_all` recreates them.

```
# CSVs in ./csv/ or ./data/csv/ (or set EA_CSV_DIR)
bash run_all.sh        # Mac/Linux
run_all.bat            # Windows (double-click)
```
Python 3.10+, with DuckDB for all SQL (it runs directly on the CSVs, so no database server is needed). Rebuilding the deck needs Node.js + `pptxgenjs`.

| File | Purpose |
|---|---|
| `sql/00_setup_clean.sql` | Cleaned views: device→player map (linked devices), deduplicated purchases, refunds split out, ad_view shifted −8h |
| `sql/1a_daily_health.sql` | Task 1(a) DAU, revenue, ARPDAU, payer share by day × platform |
| `sql/1b_retention.sql`, `1b_weekly_retention.sql` | Task 1(b) cohort grid with censoring rule |
| `sql/1c_spenders.sql` | Task 1(c) concentration, time to first purchase, repeat gap (LAG) |
| `sql/1d_ads.sql` | Task 1(d) cap-hit rate and daily ad views |
| `sql/2a_arpdau_mix.sql` + `task2_arpdau.py` | Deep-dive 2(a) mix decomposition, value per install, LTV |
| `sql/3_channel_cohort.sql` + `task3_channels.py` | Channel comparison, bootstrap CIs, regression, MDE |
| `sql/4a_return_curve.sql`, `sql/4b_churn_features.sql` + `task4_churn.py` | Churn definition, features, model, thresholds |
| `task1_run.py` | Runs the Task 1 SQL, writes `outputs/` and `charts/` |
| `deck_data.py`, `deck/build_deck.js` | Deck built from `outputs/` (every number is traceable) |
| `exploration/` | First-pass profiling queries that found the data issues |

## Data quality issues handled
1. ad_view timestamps are 8h ahead of the other tables. Shifted back (after the shift, 100% of ad-days match an active day).
2. Ad logging outage on 5–6 Mar. Excluded and flagged.
3. 122 duplicated purchase_ids. Kept the first.
4. 226 refunds (negative rows). Excluded from gross; net reported.
5. 3,211 linked devices. Collapsed to one player.
6. 2,434 sale purchases on days with no activity (114 before install). Kept in revenue, excluded from payer share.
7. install_date is not first activity; 228 currency_spend outlier rows. Noted and not used.
