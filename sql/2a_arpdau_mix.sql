-- =====================================================================
-- 2(a) ARPDAU: first 30 days (Jan 1-30) vs last 30 days (Apr 1-30)
-- Player-days and gross revenue per segment and period. Revenue is
-- attributed to the purchaser's segment; purchases on days without an
-- activity row still count (money is real), exactly as in 1(a).
-- Segments: country_tier, player age band (days since install), platform.
-- =====================================================================
CREATE OR REPLACE TABLE seg_days AS
SELECT CASE WHEN a.activity_date BETWEEN DATE '2026-01-01' AND DATE '2026-01-30' THEN 'first30'
            WHEN a.activity_date BETWEEN DATE '2026-04-01' AND DATE '2026-04-30' THEN 'last30' END AS period,
       p.country_tier, p.platform, p.acquisition_channel,
       CASE WHEN datediff('day', p.install_date, a.activity_date) <= 6  THEN '1 age 0-6d'
            WHEN datediff('day', p.install_date, a.activity_date) <= 29 THEN '2 age 7-29d'
            ELSE '3 age 30d+' END AS age_band,
       COUNT(*) AS player_days
FROM activity a JOIN player p USING (player_id)
WHERE a.activity_date BETWEEN DATE '2026-01-01' AND DATE '2026-01-30'
   OR a.activity_date BETWEEN DATE '2026-04-01' AND DATE '2026-04-30'
GROUP BY ALL;

CREATE OR REPLACE TABLE seg_rev AS
SELECT CASE WHEN pv.purchase_date BETWEEN DATE '2026-01-01' AND DATE '2026-01-30' THEN 'first30'
            WHEN pv.purchase_date BETWEEN DATE '2026-04-01' AND DATE '2026-04-30' THEN 'last30' END AS period,
       p.country_tier, p.platform, p.acquisition_channel,
       CASE WHEN datediff('day', p.install_date, pv.purchase_date) <= 6  THEN '1 age 0-6d'
            WHEN datediff('day', p.install_date, pv.purchase_date) <= 29 THEN '2 age 7-29d'
            ELSE '3 age 30d+' END AS age_band,
       SUM(pv.usd_amount) AS revenue, COUNT(*) AS purchases
FROM purchase_valid pv JOIN player p USING (player_id)
WHERE pv.purchase_date BETWEEN DATE '2026-01-01' AND DATE '2026-01-30'
   OR pv.purchase_date BETWEEN DATE '2026-04-01' AND DATE '2026-04-30'
GROUP BY ALL;

-- Headline: overall and by tier
SELECT COALESCE(country_tier::VARCHAR, 'ALL') AS tier,
       SUM(player_days) FILTER (WHERE period = 'first30') AS pdays_first,
       SUM(player_days) FILTER (WHERE period = 'last30')  AS pdays_last,
       ROUND(SUM(revenue) FILTER (WHERE period = 'first30') / SUM(player_days) FILTER (WHERE period = 'first30'), 4) AS arpdau_first,
       ROUND(SUM(revenue) FILTER (WHERE period = 'last30')  / SUM(player_days) FILTER (WHERE period = 'last30'), 4)  AS arpdau_last
FROM (
    SELECT period, country_tier, SUM(player_days) AS player_days, 0 AS revenue FROM seg_days GROUP BY ALL
    UNION ALL
    SELECT period, country_tier, 0, SUM(revenue) FROM seg_rev GROUP BY ALL
)
GROUP BY ROLLUP (country_tier)
ORDER BY country_tier NULLS FIRST;
