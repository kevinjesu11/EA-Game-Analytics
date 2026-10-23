-- Supplement to 1(b): players here play intermittently, so "active on exactly day N"
-- understates how many are still around. Share active at least once in week W of life
-- (days 7W..7W+6), same censoring rule (cell shown only if every member has completed week W).
WITH cohort AS (
    SELECT player_id, install_date, date_trunc('week', install_date)::DATE AS cohort_week
    FROM player WHERE install_date >= DATE '2026-01-01'
), w AS (SELECT UNNEST([1, 4]) AS wk)
SELECT c.cohort_week, w.wk AS week_of_life,
       CASE WHEN MAX(c.install_date) + 7 * w.wk + 6 <= DATE '2026-04-30' THEN
         ROUND(100.0 * COUNT(DISTINCT a.player_id) / COUNT(DISTINCT c.player_id), 1) END AS pct_active_in_week
FROM cohort c CROSS JOIN w
LEFT JOIN activity a ON a.player_id = c.player_id
     AND a.activity_date BETWEEN c.install_date + 7 * w.wk AND c.install_date + 7 * w.wk + 6
GROUP BY 1, 2 ORDER BY 1, 2;
