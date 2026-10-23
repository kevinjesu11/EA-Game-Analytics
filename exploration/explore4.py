import duckdb
con = duckdb.connect()
for t in ['player_profile','player_day','purchase','currency_spend','ad_view']:
    con.execute(f"create view {t} as select * from read_csv_auto('csv/{t}.csv', header=true)")
con.execute("create view pd as select *, strptime(activity_date::varchar,'%Y%m%d')::date d from player_day")
def q(s): print('>>',s.strip()[:150]); print(con.sql(s).df().to_string()); print()
q("""with f as (select device_id, min(d) fd from pd group by 1) select datediff('day',p.install_date,f.fd) gap, count(*) from player_profile p join f using(device_id) where install_date>='2026-01-01' group by 1 order by 1 limit 20""")
q("""with f as (select device_id, min(d) fd from pd group by 1) select original_device_id is not null linked, datediff('day',p.install_date,f.fd)=0 same, count(*) from player_profile p join f using(device_id) where install_date>='2026-01-01' group by all order by all""")
q("""select p.original_device_id is not null linked, count(*) from purchase x join player_profile p using(device_id) where x.event_ts::date < p.install_date group by 1""")
q("""select x.*, p.install_date, p.original_device_id from purchase x join player_profile p using(device_id) where x.event_ts::date < p.install_date limit 6""")
q("select count(*) chains from player_profile p join player_profile o on o.device_id=p.original_device_id where o.original_device_id is not null")
q("select count(*) from player_profile p where exists(select 1 from player_profile o where o.original_device_id=p.device_id) and p.original_device_id is not null")
q("select install_date>='2026-01-01' inwin, original_device_id is not null linked, count(*) from player_profile group by all order by all")
# linked: original install vs linked install
q("""select case when o.install_date<p.install_date then 'orig earlier' when o.install_date=p.install_date then 'same' else 'orig later' end rel, count(*) from player_profile p join player_profile o on o.device_id=p.original_device_id group by 1""")
