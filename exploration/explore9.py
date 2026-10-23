import duckdb
con = duckdb.connect()
for t in ['player_profile','player_day','purchase','currency_spend','ad_view']:
    con.execute(f"create view {t} as select * from read_csv_auto('csv/{t}.csv', header=true)")
con.execute("create view pd as select *, strptime(activity_date::varchar,'%Y%m%d')::date d from player_day")
def q(s): print('>>',s.strip()[:150]); print(con.sql(s).df().to_string()); print()
q("select event_ts::date d, count(*) from ad_view where event_ts between '2026-03-03' and '2026-03-09' group by 1 order by 1")
q("select min(event_ts), max(event_ts) from ad_view where event_ts between '2026-03-04' and '2026-03-08'")
q("select status, count(*) from ad_view group by 1")
q("select status, placement, reward_type, count(*), min(reward_amount), avg(reward_amount), max(reward_amount) from ad_view group by all order by 1,2")
q("select ad_daily_cap, ad_daily_count, count(*) from ad_view group by all order by 1,2")
q("select date_trunc('week', event_ts - interval 8 hour) w, count(*) n, round(100.0*avg((status='completed')::int),1) pct_comp, round(100*avg((ad_daily_count>ad_daily_cap)::int),2) over_cap from ad_view group by 1 order by 1")
