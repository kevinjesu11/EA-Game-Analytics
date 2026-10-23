import duckdb
con = duckdb.connect()
for t in ['player_profile','player_day','purchase','currency_spend','ad_view']:
    con.execute(f"create view {t} as select * from read_csv_auto('csv/{t}.csv', header=true)")
con.execute("create view pd as select *, strptime(activity_date::varchar,'%Y%m%d')::date d from player_day")
def q(s): print('>>',s.strip()[:150]); print(con.sql(s).df().to_string()); print()
# refunds: do they share purchase_id with positive?
q("""select count(*) refunds, count(p2.purchase_id) matched_pos_id,
 count(*) filter (where p2.event_ts < r.event_ts) pos_before
 from purchase r left join purchase p2 on p2.purchase_id=r.purchase_id and p2.usd_amount>0 where r.usd_amount<0""")
q("""select r.*, p2.event_ts pos_ts from purchase r left join purchase p2 on p2.device_id=r.device_id and p2.usd_amount=-r.usd_amount where r.usd_amount<0 limit 5""")
q("""select count(*) from purchase r where usd_amount<0 and not exists(select 1 from purchase p where p.device_id=r.device_id and p.usd_amount=-r.usd_amount and p.event_ts<=r.event_ts)""")
# dup ids: gap
q("""with d as (select purchase_id, count(*) c, max(event_ts)-min(event_ts) gap, count(distinct device_id) nd, count(distinct usd_amount) na from purchase group by 1 having count(*)>1) select c, nd, na, count(*), min(gap), median(gap), max(gap) from d group by all""")
# activity before install / purchase before install / first_purchase_date mismatch
q("select count(*) rows_before_install, count(distinct pd.device_id) from pd join player_profile p using(device_id) where pd.d < p.install_date")
q("select count(*) purch_before_install from purchase x join player_profile p using(device_id) where x.event_ts::date < p.install_date")
q("""with fp as (select device_id, min(event_ts)::date f from purchase where usd_amount>0 group by 1)
 select count(*) filter(where p.first_purchase_date is null and fp.f is not null) prof_null_but_purch,
 count(*) filter(where p.first_purchase_date is not null and fp.f is null) prof_set_no_purch,
 count(*) filter(where p.first_purchase_date<>fp.f) mismatch
 from player_profile p left join fp using(device_id)""")
# installs in window: active on install day?
q("""select count(*) n, count(*) filter (where exists(select 1 from pd where pd.device_id=p.device_id and pd.d=p.install_date)) active_d0,
 count(*) filter (where not exists(select 1 from pd where pd.device_id=p.device_id)) never_active
 from player_profile p where install_date>='2026-01-01'""")
q("select count(*) filter(where install_date<'2026-01-01') pre, count(*) filter(where install_date<'2026-01-01' and exists(select 1 from pd where pd.device_id=p.device_id)) pre_active from player_profile p")
# linked devices
q("""select count(*) linked, count(o.device_id) orig_exists, count(*) filter(where o.install_date<=p.install_date) orig_earlier,
 count(distinct p.original_device_id) distinct_orig from player_profile p left join player_profile o on o.device_id=p.original_device_id where p.original_device_id is not null""")
q("""select p.acquisition_channel, o.acquisition_channel orig_ch, count(*) from player_profile p join player_profile o on o.device_id=p.original_device_id group by all order by 3 desc""")
q("""select count(*) overlapping_days from pd a join player_profile p on p.device_id=a.device_id join pd b on b.device_id=p.original_device_id and b.d=a.d""")
q("""select median(datediff('day', o_last, p.install_date)) from player_profile p join (select device_id, max(d) o_last from pd group by 1) l on l.device_id=p.original_device_id""")
