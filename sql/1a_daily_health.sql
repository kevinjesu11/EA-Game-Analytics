-- =====================================================================
-- 1(a) Daily health by day x platform
--   DAU            = distinct players with a player_day row that day
--                    (linked devices collapsed to one player)
--   gross_revenue  = sum of valid purchases (deduplicated, refunds excluded)
--   net_revenue    = gross minus refunds booked that day (for reference)
--   ARPDAU         = gross_revenue / DAU
--   payer_share    = active players who made >=1 valid purchase that day / DAU
--                    Numerator restricted to players who are ALSO in DAU so the
--                    ratio is a true share. (2,480 sale-day purchases have no
--                    activity row that day - see DQ note; they still count
--                    in revenue because the money is real.)
-- Platform = the player's platform (from earliest-installed device).
-- =====================================================================
WITH dau AS (
    SELECT a.activity_date AS day, p.platform, COUNT(*) AS dau
    FROM activity a JOIN player p USING (player_id)
    GROUP BY 1, 2
),
rev AS (
    SELECT pc.purchase_date AS day, p.platform,
           SUM(CASE WHEN NOT is_refund THEN usd_amount ELSE 0 END) AS gross_revenue,
           SUM(usd_amount)                                          AS net_revenue
    FROM purchase_clean pc JOIN player p USING (player_id)
    GROUP BY 1, 2
),
payers AS (
    SELECT a.activity_date AS day, p.platform, COUNT(DISTINCT a.player_id) AS active_payers
    FROM activity a
    JOIN player p USING (player_id)
    JOIN purchase_valid pv ON pv.player_id = a.player_id AND pv.purchase_date = a.activity_date
    GROUP BY 1, 2
)
SELECT d.day, d.platform, d.dau,
       ROUND(COALESCE(r.gross_revenue, 0), 2)                  AS gross_revenue,
       ROUND(COALESCE(r.net_revenue, 0), 2)                    AS net_revenue,
       ROUND(COALESCE(r.gross_revenue, 0) / d.dau, 4)          AS arpdau,
       COALESCE(py.active_payers, 0)                           AS active_payers,
       ROUND(100.0 * COALESCE(py.active_payers, 0) / d.dau, 3) AS payer_share_pct
FROM dau d
LEFT JOIN rev    r  USING (day, platform)
LEFT JOIN payers py USING (day, platform)
ORDER BY d.day, d.platform;
