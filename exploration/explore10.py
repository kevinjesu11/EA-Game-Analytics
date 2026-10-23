import duckdb
con = duckdb.connect()
for t in ['player_profile','player_day','purchase','currency_spend','ad_view']:
    con.execute(f"create view {t} as select * from read_csv_auto('csv/{t}.csv', header=true)")
con.execute("create view pd as select *, strptime(activity_date::varchar,'%Y%m%d')::date d from player_day")
def q(s): print('>>',s.strip()[:150]); print(con.sql(s).df().to_string()); print()
for shift in [0,8]:
    q(f"""with a as (select *, (event_ts - interval {shift} hour)::date d, row_number() over(partition by device_id,(event_ts - interval {shift} hour)::date order by event_ts) rn,
      count(*) over(partition by device_id,(event_ts - interval {shift} hour)::date) n from ad_view)
      select {shift} shift, avg((ad_daily_count=rn)::int) cnt_eq_rownum, avg((max_c = n)::int) from (select *, max(ad_daily_count) over(partition by device_id,d) max_c from a)""")
q("""with a as (select *, (event_ts - interval 8 hour)::date d, row_number() over(partition by device_id,(event_ts - interval 8 hour)::date order by event_ts) rn from ad_view)
select status, avg((ad_daily_count=rn)::int) from a group by 1""")
q("""with a as (select *, (event_ts - interval 8 hour)::date d from ad_view)
 select device_id, event_ts, status, ad_daily_count, ad_daily_cap from a where device_id in (select device_id from a where ad_daily_count=5 limit 1) order by event_ts limit 30""")
# cap changes within player
q("select count(*) players, count(*) filter(where nc>1) multi_cap from (select device_id, count(distinct ad_daily_cap) nc from ad_view group by 1)")
q("""select p.country_tier, p.platform, ad_daily_cap, count(distinct a.device_id) from ad_view a join player_profile p using(device_id) group by all order by all""")
# ad active but not in player_day
q("""select count(*) addays, count(*) filter(where not exists(select 1 from pd where pd.device_id=a.device_id and pd.d=a.d)) noact from (select distinct device_id,(event_ts - interval 8 hour)::date d from ad_view) a""")
q("""select count(*) addays, count(*) filter(where not exists(select 1 from pd where pd.device_id=a.device_id and pd.d=a.d)) noact from (select distinct device_id,(event_ts)::date d from ad_view) a""")
