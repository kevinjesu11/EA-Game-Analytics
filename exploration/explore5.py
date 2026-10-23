import duckdb
con = duckdb.connect()
for t in ['player_profile','player_day','purchase','currency_spend','ad_view']:
    con.execute(f"create view {t} as select * from read_csv_auto('csv/{t}.csv', header=true)")
con.execute("create view pd as select *, strptime(activity_date::varchar,'%Y%m%d')::date d from player_day")
def q(s): print('>>',s.strip()[:150]); print(con.sql(s).df().to_string()); print()
q("select count(*) purch, count(*) filter(where not exists(select 1 from pd where pd.device_id=x.device_id and pd.d=x.event_ts::date)) no_activity_that_day from purchase x")
q("select hour(event_ts) h, count(*) from purchase group by 1 order by 1")
q("select hour(event_ts) h, count(*) from ad_view group by 1 order by 1")
q("select hour(event_ts) h, count(*) from currency_spend group by 1 order by 1")
