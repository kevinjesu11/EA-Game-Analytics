"""Task 1: runs the SQL in sql/1*.sql, writes tables to outputs/ and charts to charts/."""
import run_sql, matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt, pandas as pd
from style import apply_style, C
apply_style()
con = run_sql.connect()
pd.set_option('display.width', 200)

# ---------- 1a
daily = run_sql.run_file(con, 'sql/1a_daily_health.sql')
daily.to_csv('outputs/1a_daily_health.csv', index=False)
tot = daily.groupby('day').agg(dau=('dau','sum'), rev=('gross_revenue','sum'), net=('net_revenue','sum'), payers=('active_payers','sum')).reset_index()
tot['arpdau'] = tot.rev/tot.dau
print('1a platform summary (window totals):')
s = daily.groupby('platform').agg(player_days=('dau','sum'), gross=('gross_revenue','sum'), net=('net_revenue','sum'), payers=('active_payers','sum'))
s['arpdau']=s.gross/s.player_days; s['payer_share_pct']=100*s.payers/s.player_days
print(s.round(3)); print('TOTAL gross', round(tot.rev.sum(),2), 'net', round(tot.net.sum(),2), 'player-days', tot.dau.sum())
# sanity: 1a revenue vs purchase table
chk = con.sql("select sum(usd_amount) from purchase_valid").fetchone()[0]
print('sanity gross from purchase_valid:', round(chk,2))

fig, ax = plt.subplots(2,1, figsize=(11,6), sharex=True)
for plat, col in [('iOS', C[0]), ('Android', C[1])]:
    d = daily[daily.platform==plat]
    ax[0].plot(d.day, d.dau, color=col, label=plat)
    ax[1].plot(d.day, d.arpdau.rolling(7).mean(), color=col, label=plat)
ax[0].set_title('Daily active players by platform'); ax[0].legend(frameon=False)
ax[1].set_title('ARPDAU (USD, 7-day rolling mean; spikes are 2-day sales)')
plt.tight_layout(); plt.savefig('charts/1a_daily_health.png', dpi=160); plt.close()

# ---------- 1b
ret = run_sql.run_file(con, 'sql/1b_retention.sql')
ret.to_csv('outputs/1b_retention.csv', index=False)
print('\n1b retention grid:'); print(ret.to_string())
wr = run_sql.run_file(con, 'sql/1b_weekly_retention.sql').pivot(index='cohort_week', columns='week_of_life', values='pct_active_in_week')
wr.to_csv('outputs/1b_weekly_retention.csv'); print('\n1b % active at least once in week 1 / week 4 of life:'); print(wr.to_string())

# ---------- 1c
gaps = run_sql.run_file(con, 'sql/1c_spenders.sql'); gaps.to_csv('outputs/1c_repeat_gap.csv', index=False)
conc = con.sql('select * from concentration').df(); conc.to_csv('outputs/1c_concentration.csv', index=False)
fpd = con.sql('select * from first_purchase_dist').df(); fpd.to_csv('outputs/1c_first_purchase.csv', index=False)
print('\n1c concentration:'); print(conc.to_string())
print('\n1c first purchase:'); print(fpd.to_string())
print('\n1c repeat gap:'); print(gaps.to_string())
gd = con.sql("select gap_days from repeat_gaps where gap_days is not null").df()
fig, ax = plt.subplots(figsize=(9,3.6))
ax.hist(gd.gap_days.clip(upper=60), bins=60, color=C[0])
ax.set_title('Days between consecutive purchases (repeat buyers, capped at 60)'); ax.set_xlabel('days')
plt.tight_layout(); plt.savefig('charts/1c_repeat_gap.png', dpi=160); plt.close()

# ---------- 1d
ads = run_sql.run_file(con, 'sql/1d_ads.sql'); ads.to_csv('outputs/1d_daily_ads.csv', index=False)
cap = con.sql('select * from cap_hit').df(); cap.to_csv('outputs/1d_cap_hit.csv', index=False)
print('\n1d cap hit:'); print(cap.to_string())
dist = con.sql("select cap, least(max_count,8) n, count(*) c from ad_player_day where ad_date not in ('2026-03-05','2026-03-06') group by all order by all").df()
print(dist.pivot(index='n', columns='cap', values='c'))
fig, ax1 = plt.subplots(figsize=(11,4))
ax1.plot(ads.day, ads.completed_views, color=C[0], label='Completed ad views')
ax1.set_ylabel('completed views / day')
ax2 = ax1.twinx(); ax2.plot(ads.day, ads.completed_per_dau, color=C[2], lw=1.2, label='per DAU'); ax2.set_ylabel('views per DAU'); ax2.set_ylim(0,1.2)
ax1.axvspan(pd.Timestamp('2026-03-05'), pd.Timestamp('2026-03-07'), color='#d62728', alpha=.15)
ax1.annotate('No ad events logged\n5–6 Mar (outage)', xy=(pd.Timestamp('2026-03-06'), 300), xytext=(pd.Timestamp('2026-03-15'), 1200),
             arrowprops=dict(arrowstyle='->', color='#555'), fontsize=9)
ax1.set_title('Rewarded ad views per day — volume tracks DAU; ~0.8 completed views per active player')
plt.tight_layout(); plt.savefig('charts/1d_daily_ads.png', dpi=160); plt.close()
