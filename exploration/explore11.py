import duckdb
con = duckdb.connect()
for t in ['player_profile','player_day','purchase','currency_spend','ad_view']:
    con.execute(f"create view {t} as select * from read_csv_auto('csv/{t}.csv', header=true)")
con.execute("create view pd as select *, strptime(activity_date::varchar,'%Y%m%d')::date d from player_day")
def q(s): print('>>',s.strip()[:150]); print(con.sql(s).df().to_string()); print()
q("select currency_type, count(*), quantile_cont(currency_value,[0.5,0.99,0.999]) q, max(currency_value), count(*) filter(where currency_value>100000) big from currency_spend group by 1")
q("select * from currency_spend where currency_value>100000 limit 5")
q("select count(*) filter(where ad_daily_cap_n>1) from (select device_id,(event_ts - interval 8 hour)::date d, count(distinct ad_daily_cap) ad_daily_cap_n from ad_view group by all)")
q("select app_version, min(d), max(d), count(*) from pd group by 1 order by 2")
q("""with pp as (select p.*, datediff('day', install_date, d) age from pd join player_profile p using(device_id))
 select d >= '2026-04-01' late, count(*) filter(where age<=7)*1.0/count(*) new_share from pp where d<'2026-01-31' or d>='2026-04-01' group by 1""")
