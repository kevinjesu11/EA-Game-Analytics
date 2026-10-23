-- =====================================================================
-- 4. Justifying the churn window: after a player has been inactive for
-- k consecutive days, how likely are they to come back at all?
-- Uses gaps between consecutive active days (LEAD) observed before Apr 1,
-- so every gap has >= 30 days of follow-up.
-- =====================================================================
WITH g AS (
    SELECT player_id, activity_date,
           LEAD(activity_date) OVER (PARTITION BY player_id ORDER BY activity_date) AS next_date
    FROM activity
), gaps AS (
    SELECT player_id, activity_date,
           COALESCE(datediff('day', activity_date, next_date), 999) AS gap
    FROM g WHERE activity_date <= DATE '2026-03-31'
), k AS (SELECT UNNEST([1,2,3,5,7,10,14,21,28]) AS k)
SELECT k.k AS days_inactive,
       COUNT(*) FILTER (WHERE gap > k.k)                                      AS spells_reaching_k,
       ROUND(100.0 * COUNT(*) FILTER (WHERE gap > k.k AND gap <= LEAST(k.k + 30, datediff('day', activity_date, DATE '2026-04-30')))
             / COUNT(*) FILTER (WHERE gap > k.k), 1)                          AS pct_return_within_30d
FROM gaps, k
GROUP BY 1 ORDER BY 1;
