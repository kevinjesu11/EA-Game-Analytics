-- =====================================================================
-- 3. One row per in-window player with >= 30 days of observation
--    (install 2026-01-01 .. 2026-03-31).
--   d7_retained  = active on install_date + 7            (engagement)
--   rev30        = gross valid purchases in days 0-29   (revenue)
--   payer30      = made >= 1 purchase in days 0-29
--   Channel/tier = from the player's earliest-installed device.
--   Linked devices (n_devices > 1) flagged: their channel is ambiguous.
-- =====================================================================
SELECT p.player_id, p.acquisition_channel AS channel, p.country_tier, p.platform,
       date_trunc('month', p.install_date)::DATE AS install_month, p.install_date, p.n_devices,
       MAX(CASE WHEN a.activity_date = p.install_date + 7 THEN 1 ELSE 0 END) AS d7_retained,
       COUNT(DISTINCT a.activity_date) FILTER (WHERE a.activity_date <= p.install_date + 29) AS active_days30,
       COALESCE(MAX(r.rev30), 0) AS rev30,
       (COALESCE(MAX(r.rev30), 0) > 0)::INT AS payer30
FROM player p
LEFT JOIN activity a ON a.player_id = p.player_id
LEFT JOIN (SELECT pv.player_id, SUM(pv.usd_amount) AS rev30
           FROM purchase_valid pv JOIN player q USING (player_id)
           WHERE pv.purchase_date BETWEEN q.install_date AND q.install_date + 29
           GROUP BY 1) r ON r.player_id = p.player_id
WHERE p.install_date BETWEEN DATE '2026-01-01' AND DATE '2026-03-31'
GROUP BY ALL;