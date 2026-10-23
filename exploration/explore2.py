import duckdb
con = duckdb.connect()
for t in ['player_profile','player_day','purchase','currency_spend','ad_view']:
    con.execute(f"create view {t} as select * from read_csv_auto('csv/{t}.csv', header=true)")
def q(s): print('>>',s.strip()[:120]); print(con.sql(s).df().to_string()); print()
# duplicates
q("select count(*) n, count(distinct purchase_id) ids, count(distinct (device_id,event_ts,pack_name,usd_amount)) uniq_rows from purchase")
q("select count(*) n, count(distinct device_id) from player_profile")
q("select count(*) n, count(distinct (device_id,activity_date)) from player_day")
q("select count(*) n, (select count(*) from (select distinct * from ad_view)) d from ad_view")
q("select count(*) n, (select count(*) from (select distinct * from currency_spend)) d from currency_spend")
q("select pack_name, usd_amount, currency_granted, sale_flag, count(*) from purchase group by all order by 1,2,4")
q("select * from purchase where purchase_id in (select purchase_id from purchase group by 1 having count(*)>1) order by purchase_id limit 12")
q("select * from purchase where usd_amount<0 limit 8")
q("select count(*) from purchase p where not exists (select 1 from player_profile x where x.device_id=p.device_id)")
q("select count(*) from player_day p where not exists (select 1 from player_profile x where x.device_id=p.device_id)")
q("select date_trunc('week',install_date) wk, count(*) from player_profile group by 1 order by 1")
