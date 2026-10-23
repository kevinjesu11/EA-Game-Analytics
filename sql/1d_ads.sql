-- =====================================================================
-- 1(d) Rewarded-ad engagement (ad_view shifted -8h to local day, see 00)
--   ad_daily_count counts every ad interaction (started/abandoned/completed)
--   and resets at local midnight; the cap is constant within a player-day.
--   A player-day "hits the cap" when its max ad_daily_count >= ad_daily_cap.
--   2026-03-05 and 03-06 excluded: logging outage (zero ad events).
-- =====================================================================
CREATE OR REPLACE TABLE ad_player_day AS
SELECT player_id, device_id, ad_date,
       MAX(ad_daily_cap)                               AS cap,
       MAX(ad_daily_count)                             AS max_count,
       COUNT(*)                                        AS interactions,
       COUNT(*) FILTER (WHERE status = 'completed')    AS completed
FROM ad_view_local
GROUP BY 1, 2, 3;

CREATE OR REPLACE TABLE cap_hit AS
SELECT cap,
       COUNT(*)                                          AS ad_player_days,
       SUM((max_count >= cap)::INT)                      AS days_hit_cap,
       ROUND(100 * AVG((max_count >= cap)::INT), 2)      AS pct_hit_cap,
       ROUND(100 * AVG((max_count >= 5)::INT), 2)        AS pct_reached_5,
       ROUND(AVG(interactions), 2)                       AS avg_interactions,
       ROUND(AVG(completed), 2)                          AS avg_completed
FROM ad_player_day
WHERE ad_date NOT IN (DATE '2026-03-05', DATE '2026-03-06')
GROUP BY ROLLUP (cap) ORDER BY cap;

-- Daily totals (all local days, gap left visible) + ads per DAU
SELECT d.activity_date AS day,
       COALESCE(a.views, 0)       AS ad_interactions,
       COALESCE(a.completed, 0)   AS completed_views,
       d.dau,
       ROUND(COALESCE(a.completed, 0) * 1.0 / d.dau, 3) AS completed_per_dau
FROM (SELECT activity_date, COUNT(*) AS dau FROM activity GROUP BY 1) d
LEFT JOIN (SELECT ad_date, COUNT(*) AS views,
                  COUNT(*) FILTER (WHERE status = 'completed') AS completed
           FROM ad_view_local GROUP BY 1) a ON a.ad_date = d.activity_date
ORDER BY 1;
