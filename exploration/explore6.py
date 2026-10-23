import duckdb
con = duckdb.connect()
for t in ['player_profile','player_day','purchase','currency_spend','ad_view']:
    con.execute(f"create view {t} as select * from read_csv_auto('csv/{t}.csv', header=true)")
con.execute("create view pd as select *, strptime(activity_date::varchar,'%Y%m%d')::date d from player_day")
def q(s): print('>>',s.strip()[:150]); print(con.sql(s).df().to_string()); print()
q("""select usd_amount<0 refund, count(*) n,
 count(*) filter(where exists(select 1 from pd where pd.device_id=x.device_id and pd.d=x.event_ts::date)) same_day,
 count(*) filter(where exists(select 1 from pd where pd.device_id=x.device_id and pd.d between x.event_ts::date-1 and x.event_ts::date+1)) pm1,
 count(*) filter(where not exists(select 1 from pd where pd.device_id=x.device_id)) never_active
 from purchase x group by 1""")
q("""select x.sale_flag, count(*) n, count(*) filter(where not exists(select 1 from pd where pd.device_id=x.device_id and pd.d=x.event_ts::date)) noact from purchase x where usd_amount>0 group by 1""")
q("""select date_trunc('month',event_ts) m, count(*) n, count(*) filter(where not exists(select 1 from pd where pd.device_id=x.device_id and pd.d=x.event_ts::date)) noact from purchase x where usd_amount>0 group by 1 order by 1""")
q("select hour(event_ts) h, count(*) n, count(*) filter(where not exists(select 1 from pd where pd.device_id=x.device_id and pd.d=x.event_ts::date)) noact from purchase x where usd_amount>0 group by 1 order by 1")
# ad counter reset boundary: rows with count=1 by shifted hour
q("select hour(event_ts - interval 8 hour) h, count(*) filter(where ad_daily_count=1) c1, count(*) n from ad_view group by 1 order by 1")
