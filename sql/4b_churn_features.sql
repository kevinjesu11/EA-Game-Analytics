-- =====================================================================
-- 4. Churn modelling table: one row per (snapshot date s, player)
--   Population : players active at least once in [s-6, s]  ("currently active")
--   Label      : churn14 = 1 if NO activity in [s+1, s+14]
--   Snapshots  : weekly, 2026-01-29 .. 2026-04-16 (needs 28d history
--                behind s and 14d of future ahead of s; data end 04-30)
--   Features   : only information available on or before s.
-- =====================================================================
CREATE OR REPLACE TABLE snapshots AS
SELECT UNNEST(generate_series(DATE '2026-01-29', DATE '2026-04-16', INTERVAL 7 DAY))::DATE AS s;

CREATE OR REPLACE TABLE churn_base AS
SELECT s.s, a.player_id,
       MIN(datediff('day', a.activity_date, s.s))                                    AS days_since_last,
       COUNT(*) FILTER (WHERE a.activity_date >= s.s - 6)                            AS active_days_7,
       COUNT(*)                                                                      AS active_days_28,
       SUM(a.session_count) FILTER (WHERE a.activity_date >= s.s - 6)                AS sessions_7,
       SUM(a.playtime_minutes) FILTER (WHERE a.activity_date >= s.s - 6)             AS playtime_7,
       SUM(a.playtime_minutes)                                                       AS playtime_28,
       MAX(a.player_level)                                                           AS level,
       MAX(a.player_level) - MIN(a.player_level)                                     AS level_gain_28
FROM snapshots s
JOIN activity a ON a.activity_date BETWEEN s.s - 27 AND s.s
GROUP BY 1, 2
HAVING COUNT(*) FILTER (WHERE a.activity_date >= s.s - 6) > 0;

CREATE OR REPLACE TABLE churn_table AS
SELECT b.*,
       datediff('day', p.install_date, b.s)                    AS age_days,
       p.country_tier, p.platform, p.acquisition_channel,
       COALESCE(pay.rev_28, 0)                                 AS rev_28,
       (COALESCE(pay.n_before, 0) > 0)::INT                    AS payer_ever,
       COALESCE(ad.ads_7, 0)                                   AS ads_completed_7,
       COALESCE(cs.spends_7, 0)                                AS spends_7,
       (fut.player_id IS NULL)::INT                            AS churn14
FROM churn_base b
JOIN player p USING (player_id)
LEFT JOIN (SELECT s.s, pv.player_id,
                  SUM(pv.usd_amount) FILTER (WHERE pv.purchase_date >= s.s - 27) AS rev_28,
                  COUNT(*) AS n_before
           FROM snapshots s JOIN purchase_valid pv ON pv.purchase_date <= s.s
           GROUP BY 1, 2) pay ON pay.s = b.s AND pay.player_id = b.player_id
LEFT JOIN (SELECT s.s, av.player_id, COUNT(*) AS ads_7
           FROM snapshots s JOIN ad_view_local av
             ON av.ad_date BETWEEN s.s - 6 AND s.s AND av.status = 'completed'
           GROUP BY 1, 2) ad ON ad.s = b.s AND ad.player_id = b.player_id
LEFT JOIN (SELECT s.s, m.player_id, COUNT(*) AS spends_7
           FROM snapshots s JOIN raw_currency_spend c
             ON c.event_ts::DATE BETWEEN s.s - 6 AND s.s
           JOIN device_map m USING (device_id)
           GROUP BY 1, 2) cs ON cs.s = b.s AND cs.player_id = b.player_id
LEFT JOIN (SELECT DISTINCT s.s, a.player_id
           FROM snapshots s JOIN activity a ON a.activity_date BETWEEN s.s + 1 AND s.s + 14) fut
       ON fut.s = b.s AND fut.player_id = b.player_id;

SELECT s, COUNT(*) AS players, ROUND(100 * AVG(churn14), 1) AS churn_rate_pct
FROM churn_table GROUP BY 1 ORDER BY 1;
