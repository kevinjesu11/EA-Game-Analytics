import duckdb
con = duckdb.connect()
for t in ['player_profile','player_day','purchase','currency_spend','ad_view']:
    con.execute(f"create view {t} as select * from read_csv_auto('csv/{t}.csv', header=true)")
con.execute("create view pd as select *, strptime(activity_date::varchar,'%Y%m%d')::date d from player_day")
def q(s): print('>>',s.strip()[:150]); print(con.sql(s).df().to_string()); print()
q("""select event_ts::date d, count(*) n, sum(sale_flag) sale, count(*) filter(where not exists(select 1 from pd where pd.device_id=x.device_id and pd.d=x.event_ts::date)) noact
 from purchase x where usd_amount>0 group by 1 order by 1""")
q("""with na as (select x.* from purchase x where usd_amount>0 and not exists(select 1 from pd where pd.device_id=x.device_id and pd.d=x.event_ts::date))
select (select min(abs(datediff('day',pd.d,na.event_ts::date))) from pd where pd.device_id=na.device_id) dist, count(*) from na group by 1 order by 1 limit 15""")
