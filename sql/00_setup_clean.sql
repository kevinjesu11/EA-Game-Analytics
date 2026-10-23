-- =====================================================================
-- 00_setup_clean.sql  —  raw tables + cleaned views used by every task
-- Engine: DuckDB (reads the CSVs directly; no server needed)
-- =====================================================================

CREATE OR REPLACE VIEW raw_player_profile AS SELECT * FROM read_csv_auto('csv/player_profile.csv', header=true);
CREATE OR REPLACE VIEW raw_player_day     AS SELECT * FROM read_csv_auto('csv/player_day.csv', header=true);
CREATE OR REPLACE VIEW raw_purchase       AS SELECT * FROM read_csv_auto('csv/purchase.csv', header=true);
CREATE OR REPLACE VIEW raw_currency_spend AS SELECT * FROM read_csv_auto('csv/currency_spend.csv', header=true);
CREATE OR REPLACE VIEW raw_ad_view        AS SELECT * FROM read_csv_auto('csv/ad_view.csv', header=true);

-- ---------------------------------------------------------------------
-- DQ1  Linked devices. original_device_id links a device to an earlier one,
-- so one person can appear as 2 (occasionally 3) devices. Resolve every
-- device to a single player_id (root of the chain, max depth seen = 2).
-- Player-level attributes come from the player's EARLIEST-installed device.
-- ---------------------------------------------------------------------
CREATE OR REPLACE TABLE device_map AS
WITH l1 AS (
    SELECT p.device_id,
           COALESCE(o.original_device_id, p.original_device_id, p.device_id) AS player_id
    FROM raw_player_profile p
    LEFT JOIN raw_player_profile o ON o.device_id = p.original_device_id
)
SELECT * FROM l1;

CREATE OR REPLACE TABLE player AS
SELECT m.player_id,
       MIN(p.install_date)                                                   AS install_date,
       arg_min(p.platform, p.install_date)                                   AS platform,
       arg_min(p.country, p.install_date)                                    AS country,
       arg_min(p.country_tier, p.install_date)                               AS country_tier,
       arg_min(p.acquisition_channel, p.install_date)                        AS acquisition_channel,
       COUNT(*)                                                              AS n_devices
FROM raw_player_profile p JOIN device_map m USING (device_id)
GROUP BY 1;

-- ---------------------------------------------------------------------
-- player_day: parse the YYYYMMDD integer, collapse to one row per
-- player per day (a person active on 2 linked devices = 1 active player).
-- ---------------------------------------------------------------------
CREATE OR REPLACE TABLE activity AS
SELECT m.player_id,
       strptime(pd.activity_date::VARCHAR, '%Y%m%d')::DATE AS activity_date,
       MAX(pd.player_level)       AS player_level,
       SUM(pd.session_count)      AS session_count,
       SUM(pd.playtime_minutes)   AS playtime_minutes,
       MAX(pd.app_version)        AS app_version,
       arg_max(pd.device_id, pd.playtime_minutes) AS device_id
FROM raw_player_day pd JOIN device_map m USING (device_id)
GROUP BY 1, 2;

-- ---------------------------------------------------------------------
-- DQ2  Purchases: (a) 122 purchase_ids are logged twice, hours apart,
-- identical in every other field -> keep the first occurrence.
-- (b) 228 negative rows are refunds of an earlier purchase -> kept
-- separately: gross revenue excludes them, net revenue subtracts them.
-- ---------------------------------------------------------------------
CREATE OR REPLACE TABLE purchase_clean AS
SELECT pu.*, m.player_id,
       pu.event_ts::DATE AS purchase_date,
       (pu.usd_amount < 0) AS is_refund
FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY purchase_id ORDER BY event_ts) AS rn
    FROM raw_purchase
) pu
JOIN device_map m USING (device_id)
WHERE pu.rn = 1;

-- Valid (gross) purchases only
CREATE OR REPLACE VIEW purchase_valid AS
SELECT * FROM purchase_clean WHERE NOT is_refund;

-- ---------------------------------------------------------------------
-- DQ3  ad_view timestamps are 8 hours ahead of every other table
-- (events run 14:00-07:59 vs 06:00-23:59 elsewhere). After shifting by
-- -8h, 100% of ad player-days coincide with a player_day row (vs 49%
-- unshifted) and ad_daily_count resets exactly at local midnight.
-- ---------------------------------------------------------------------
CREATE OR REPLACE TABLE ad_view_local AS
SELECT a.*, m.player_id,
       a.event_ts - INTERVAL 8 HOUR                AS event_ts_local,
       (a.event_ts - INTERVAL 8 HOUR)::DATE        AS ad_date
FROM raw_ad_view a JOIN device_map m USING (device_id);
