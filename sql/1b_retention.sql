-- =====================================================================
-- 1(b) Retention by install-week cohort (players installed in-window only)
--   Day N retention = share of the cohort with activity exactly on
--   install_date + N.  Cohort = ISO week (Mon) of the player's first install.
--   Pre-2026 installs are excluded: we cannot observe their early days.
-- CENSORING RULE: a cell is shown only when EVERY member of the cohort has
--   had N full days to be observed (last install in cohort + N <= 2026-04-30);
--   otherwise it is NULL (blank), not 0 - a 0 would claim players churned
--   when we simply have not seen that day yet. Partially mature cohorts are
--   not shown either, because their mature members are only the earliest
--   installers and would bias the cell.
-- =====================================================================
WITH cohort AS (
    SELECT player_id, install_date,
           date_trunc('week', install_date)::DATE AS cohort_week
    FROM player
    WHERE install_date >= DATE '2026-01-01'
),
flags AS (
    SELECT c.player_id, c.cohort_week, c.install_date,
           MAX(CASE WHEN a.activity_date = c.install_date      THEN 1 ELSE 0 END) AS d0,
           MAX(CASE WHEN a.activity_date = c.install_date + 1  THEN 1 ELSE 0 END) AS d1,
           MAX(CASE WHEN a.activity_date = c.install_date + 7  THEN 1 ELSE 0 END) AS d7,
           MAX(CASE WHEN a.activity_date = c.install_date + 14 THEN 1 ELSE 0 END) AS d14,
           MAX(CASE WHEN a.activity_date = c.install_date + 30 THEN 1 ELSE 0 END) AS d30
    FROM cohort c LEFT JOIN activity a USING (player_id)
    GROUP BY 1, 2, 3
)
SELECT cohort_week,
       COUNT(*)                         AS cohort_size,
       MIN(install_date)                AS first_install,
       MAX(install_date)                AS last_install,
       ROUND(100 * AVG(d0), 1)          AS d0_pct,
       CASE WHEN MAX(install_date) + 1  <= DATE '2026-04-30' THEN ROUND(100 * AVG(d1), 1)  END AS d1_pct,
       CASE WHEN MAX(install_date) + 7  <= DATE '2026-04-30' THEN ROUND(100 * AVG(d7), 1)  END AS d7_pct,
       CASE WHEN MAX(install_date) + 14 <= DATE '2026-04-30' THEN ROUND(100 * AVG(d14), 1) END AS d14_pct,
       CASE WHEN MAX(install_date) + 30 <= DATE '2026-04-30' THEN ROUND(100 * AVG(d30), 1) END AS d30_pct
FROM flags
GROUP BY 1
ORDER BY 1;
