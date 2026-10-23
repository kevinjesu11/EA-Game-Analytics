import duckdb
con = duckdb.connect()
for t in ['player_profile','player_day','purchase','currency_spend','ad_view']:
    con.execute(f"create view {t} as select * from read_csv_auto('csv/{t}.csv', header=true)")
con.execute("create view pd as select *, strptime(activity_date::varchar,'%Y%m%d')::date d from player_day")
def q(s): print('>>',s.strip()[:150]); print(con.sql(s).df().to_string()); print()
q("""with dau as (select d, count(*) dau from pd group by 1), inst as (select install_date d, count(*) inst from player_profile group by 1),
 ad as (select (event_ts - interval 8 hour)::date d, count(*) filter(where status='completed') adc, count(*) adall from ad_view group by 1),
 cs as (select event_ts::date d, count(*) cs from currency_spend group by 1)
 select d, dau, inst, adc, adall, cs from dau left join inst using(d) left join ad using(d) left join cs using(d) order by d""")
