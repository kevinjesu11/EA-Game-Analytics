"""Task 2(a): why is ARPDAU down ~16%? Mix-shift decomposition + value of new installs by tier."""
import run_sql, pandas as pd, numpy as np, matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from style import apply_style, C
apply_style(); pd.set_option('display.width', 200)
con = run_sql.connect()
head = run_sql.run_file(con, 'sql/2a_arpdau_mix.sql')
head['chg_pct'] = 100*(head.arpdau_last/head.arpdau_first-1)
head['share_first'] = head.pdays_first/head.pdays_first.iloc[0]*100
head['share_last'] = head.pdays_last/head.pdays_last.iloc[0]*100
print(head.round(3).to_string()); head.to_csv('outputs/2a_by_tier.csv', index=False)

days = con.sql('select * from seg_days').df(); rev = con.sql('select * from seg_rev').df()

def table(keys):
    d = days.groupby(['period']+keys).player_days.sum().unstack('period')
    r = rev.groupby(['period']+keys).revenue.sum().unstack('period').reindex(d.index).fillna(0)
    t = pd.DataFrame({'pd1': d.first30, 'pd2': d.last30, 'rev1': r.first30, 'rev2': r.last30}).fillna(0)
    t['s1']=t.pd1/t.pd1.sum(); t['s2']=t.pd2/t.pd2.sum()
    t['a1']=t.rev1/t.pd1; t['a2']=t.rev2/t.pd2
    return t

def decompose(keys, label):
    t = table(keys)
    A1 = t.rev1.sum()/t.pd1.sum(); A2 = t.rev2.sum()/t.pd2.sum()
    mix  = ((t.s2-t.s1)*(t.a1+t.a2)/2).sum()           # symmetric (Shapley) split
    rate = (((t.s1+t.s2)/2)*(t.a2-t.a1)).sum()
    print(f"\n[{label}] ARPDAU {A1:.4f} -> {A2:.4f} ({100*(A2/A1-1):+.1f}%)  mix {mix:+.4f}  within {rate:+.4f}  check {mix+rate-(A2-A1):.1e}")
    print(t.round(4).to_string())
    return dict(segmentation=label, arpdau_first=A1, arpdau_last=A2, total_change=A2-A1, mix_effect=mix, within_effect=rate,
                mix_share_of_drop=mix/(A2-A1))
res = [decompose(['country_tier'], 'tier'), decompose(['age_band'], 'player age'),
       decompose(['country_tier','age_band'], 'tier x age'), decompose(['country_tier','platform'], 'tier x platform'),
       decompose(['country_tier','platform','age_band'], 'tier x platform x age')]
dec = pd.DataFrame(res); print(dec.round(4).to_string()); dec.to_csv('outputs/2a_decomposition.csv', index=False)

# Where did the growth come from? installs by tier by month
inst = con.sql("""select date_trunc('month', install_date)::date m, country_tier, count(*) n
                  from player where install_date >= '2026-01-01' group by all order by all""").df()
ip = inst.pivot(index='m', columns='country_tier', values='n'); print('\ninstalls by month x tier\n', ip)
ip.to_csv('outputs/2a_installs_by_tier.csv')
ch = con.sql("""select date_trunc('month', install_date)::date m, acquisition_channel, count(*) n
                  from player where install_date >= '2026-01-01' group by all order by all""").df()
print(ch.pivot(index='m', columns='acquisition_channel', values='n'))

# Value of an install by tier: 30-day revenue per install (cohorts Jan 1 - Mar 31, full 30d observed)
val = con.sql("""
  with c as (select player_id, country_tier, install_date from player where install_date between '2026-01-01' and '2026-03-31'),
  r as (select c.player_id, sum(pv.usd_amount) rev from c join purchase_valid pv on pv.player_id=c.player_id
        and pv.purchase_date between c.install_date and c.install_date + 29 group by 1)
  select country_tier, count(*) installs, round(sum(coalesce(rev,0))/count(*),3) rev30_per_install,
         round(100*avg((rev is not null)::int),2) pct_pay_30d,
         round(sum(coalesce(rev,0))/nullif(count(rev),0),2) rev_per_payer
  from c left join r using(player_id) group by 1 order by 1""").df()
print('\n30-day revenue per install by tier\n', val); val.to_csv('outputs/2a_value_per_install.csv', index=False)
# total revenue & DAU per period
tot = con.sql("""select 'first30' p, (select count(*) from activity where activity_date between '2026-01-01' and '2026-01-30') pdays,
   (select sum(usd_amount) from purchase_valid where purchase_date between '2026-01-01' and '2026-01-30') rev
   union all select 'last30', (select count(*) from activity where activity_date between '2026-04-01' and '2026-04-30'),
   (select sum(usd_amount) from purchase_valid where purchase_date between '2026-04-01' and '2026-04-30')""").df()
print(tot)

# ---- Hero chart: ARPDAU by tier (flat/up) vs overall (down) + DAU mix
t = table(['country_tier'])
fig, axes = plt.subplots(1, 2, figsize=(12, 4.6), gridspec_kw={'width_ratios':[1.25,1]})
ax = axes[0]
x = np.arange(4); w = .36
ax.bar(x-w/2, t.a1.values, w, color='#94a3b8', label='Jan 1–30')
ax.bar(x+w/2, t.a2.values, w, color=C[0], label='Apr 1–30')
for i,(a1,a2) in enumerate(zip(t.a1.values,t.a2.values)):
    ax.text(i+w/2, a2+.01, f"{100*(a2/a1-1):+.0f}%", ha='center', fontsize=9, color=C[0], fontweight='bold')
A1 = t.rev1.sum()/t.pd1.sum(); A2 = t.rev2.sum()/t.pd2.sum()
ax.bar(4.4-w/2, A1, w, color='#94a3b8'); ax.bar(4.4+w/2, A2, w, color=C[3])
ax.text(4.4+w/2, A2+.01, f"{100*(A2/A1-1):+.0f}%", ha='center', fontsize=9, color=C[3], fontweight='bold')
ax.set_xticks(list(x)+[4.4]); ax.set_xticklabels(['Tier 1','Tier 2','Tier 3','Tier 4','ALL'])
ax.set_ylabel('ARPDAU (USD)'); ax.legend(frameon=False); ax.set_title('Every tier holds or improves; the total falls')
ax = axes[1]
bottom = np.zeros(2)
cols = ['#1e3a8a', '#3b82f6', '#93c5fd', '#f59e0b']
for i, tier in enumerate(t.index):
    vals = np.array([t.s1.iloc[i], t.s2.iloc[i]])*100
    ax.bar(['Jan 1–30','Apr 1–30'], vals, bottom=bottom, color=cols[i], width=.55, label=f'Tier {tier}')
    for j in range(2): ax.text(j, bottom[j]+vals[j]/2, f"{vals[j]:.0f}%", ha='center', va='center', color='white' if i<2 or i==3 else '#111', fontsize=9)
    bottom += vals
ax.set_ylabel('% of active player-days'); ax.set_title('…because the player mix shifted to Tier 4')
ax.legend(frameon=False, bbox_to_anchor=(1.0,1), loc='upper left', fontsize=9); ax.grid(False)
plt.tight_layout(); plt.savefig('charts/2a_hero.png', dpi=170); plt.close()

# LTV curve: Jan-installed players (install <= Jan 30) are observable for 90 days
ltv = con.sql("""
  with c as (select player_id, country_tier, install_date from player where install_date between '2026-01-01' and '2026-01-30')
  select country_tier, count(distinct c.player_id) installs,
    round(sum(case when pv.purchase_date <= c.install_date+29 then usd_amount else 0 end)/count(distinct c.player_id),3) rev30,
    round(sum(case when pv.purchase_date <= c.install_date+59 then usd_amount else 0 end)/count(distinct c.player_id),3) rev60,
    round(sum(case when pv.purchase_date <= c.install_date+89 then usd_amount else 0 end)/count(distinct c.player_id),3) rev90
  from c left join purchase_valid pv on pv.player_id=c.player_id and pv.purchase_date between c.install_date and c.install_date+89
  group by rollup(country_tier) order by 1""").df()
ltv['mult_90_30'] = ltv.rev90/ltv.rev30
ltv['breakeven_cpi_90d_net'] = ltv.rev90*0.70   # after ~30% app-store fee
print('\nLTV by tier (Jan cohorts)\n', ltv); ltv.to_csv('outputs/2a_ltv_by_tier.csv', index=False)
