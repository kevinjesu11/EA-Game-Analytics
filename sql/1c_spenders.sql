-- =====================================================================
-- 1(c) Spender behaviour  (valid purchases: deduped, refunds excluded)
-- =====================================================================

-- (c1) Revenue concentration. Two populations ranked:
--   payers_only : players with >=1 valid purchase in the window
--   all_players : every player active in the window (non-payers = $0)
CREATE OR REPLACE TABLE spend_by_player AS
SELECT p.player_id, COALESCE(SUM(pv.usd_amount), 0) AS revenue
FROM (SELECT DISTINCT player_id FROM activity
      UNION SELECT DISTINCT player_id FROM purchase_valid) p
LEFT JOIN purchase_valid pv USING (player_id)
GROUP BY 1;

CREATE OR REPLACE TABLE concentration AS
WITH ranked AS (
    SELECT 'payers_only' AS population, revenue,
           ROW_NUMBER() OVER (ORDER BY revenue DESC) AS rk, COUNT(*) OVER () AS n
    FROM spend_by_player WHERE revenue > 0
    UNION ALL
    SELECT 'all_players', revenue,
           ROW_NUMBER() OVER (ORDER BY revenue DESC), COUNT(*) OVER ()
    FROM spend_by_player
), tot AS (SELECT SUM(revenue) AS total FROM spend_by_player)
SELECT population, MAX(n) AS n_ranked,
       ROUND(100 * SUM(revenue) FILTER (WHERE rk <= CEIL(n * 0.01)) / MAX(total), 1) AS top1_pct_share,
       ROUND(100 * SUM(revenue) FILTER (WHERE rk <= CEIL(n * 0.10)) / MAX(total), 1) AS top10_pct_share,
       ROUND(100 * SUM(revenue) FILTER (WHERE rk <= CEIL(n * 0.50)) / MAX(total), 1) AS top50_pct_share
FROM ranked, tot
GROUP BY 1;

-- (c2) Time to first purchase, for players who installed in-window
--   and have >= 30 days of observation (install <= 2026-03-31), so that
--   "never paid (within 30d)" is not contaminated by players we have
--   barely seen. Pre-2026 installs excluded: their first purchase may
--   pre-date the data.
CREATE OR REPLACE TABLE first_purchase_dist AS
WITH fp AS (
    SELECT player_id, MIN(purchase_date) AS first_purchase
    FROM purchase_valid GROUP BY 1
), base AS (
    SELECT p.player_id, datediff('day', p.install_date, fp.first_purchase) AS days_to_first
    FROM player p LEFT JOIN fp USING (player_id)
    WHERE p.install_date BETWEEN DATE '2026-01-01' AND DATE '2026-03-31'
)
SELECT CASE
         WHEN days_to_first IS NULL THEN '9 never paid (to 30 Apr)'
         WHEN days_to_first < 0    THEN '0 before install (DQ)'
         WHEN days_to_first = 0    THEN '1 day 0'
         WHEN days_to_first = 1    THEN '2 day 1'
         WHEN days_to_first <= 3   THEN '3 day 2-3'
         WHEN days_to_first <= 7   THEN '4 day 4-7'
         WHEN days_to_first <= 14  THEN '5 day 8-14'
         WHEN days_to_first <= 30  THEN '6 day 15-30'
         ELSE                           '7 day 31+'
       END AS bucket,
       COUNT(*) AS players,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS pct_of_installs
FROM base GROUP BY 1 ORDER BY 1;

-- (c3) Repeat purchase gap, using LAG over each player's purchases
CREATE OR REPLACE TABLE repeat_gaps AS
SELECT player_id, event_ts, sale_flag,
       LAG(event_ts) OVER (PARTITION BY player_id ORDER BY event_ts) AS prev_ts,
       date_diff('hour', LAG(event_ts) OVER (PARTITION BY player_id ORDER BY event_ts), event_ts) / 24.0 AS gap_days
FROM purchase_valid;

SELECT COUNT(*)                                        AS repeat_purchases,
       COUNT(DISTINCT player_id)                       AS repeat_buyers,
       ROUND(quantile_cont(gap_days, 0.25), 1)         AS p25_days,
       ROUND(median(gap_days), 1)                      AS median_days,
       ROUND(quantile_cont(gap_days, 0.75), 1)         AS p75_days,
       ROUND(AVG(gap_days), 1)                         AS mean_days,
       ROUND(100 * AVG((gap_days < 1)::INT), 1)        AS pct_within_24h
FROM repeat_gaps WHERE gap_days IS NOT NULL;
