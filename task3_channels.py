"""Task 3: do acquisition channels differ in player quality? Naive vs tier-adjusted, with bootstrap CIs."""
import run_sql, pandas as pd, numpy as np, matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy import stats
from style import apply_style, C as PAL
apply_style(); pd.set_option('display.width', 220)
rng = np.random.default_rng(42)
con = run_sql.connect()
df = run_sql.run_file(con, 'sql/3_channel_cohort.sql')
df = df.sort_values('player_id').reset_index(drop=True)  # deterministic order for the seeded bootstrap
df['install_month'] = df.install_month.astype(str)
df.to_csv('outputs/3_channel_cohort.csv', index=False)
CH = ['organic', 'paid_social', 'paid_video']

print('players', len(df))
print('\nChannel x tier mix (% of channel installs):')
print((pd.crosstab(df.channel, df.country_tier, normalize='index')*100).round(1))
print('\nChannel x install month (counts):'); print(pd.crosstab(df.channel, df.install_month))

naive = df.groupby('channel').agg(n=('player_id','size'), d7=('d7_retained','mean'), rev30=('rev30','mean'), payer30=('payer30','mean'))
print('\nNAIVE by channel'); print(naive.round(4))
by_tier = df.groupby(['country_tier','channel']).agg(n=('player_id','size'), d7=('d7_retained','mean'), rev30=('rev30','mean'), payer30=('payer30','mean')).unstack('channel')
print('\nBY TIER'); print(by_tier.round(3).to_string())

# Tier-standardised metric: weight each channel's per-tier means by the POOLED tier mix (direct standardisation)
W = df.country_tier.value_counts(normalize=True).sort_index()
def std_mean(d, col):
    m = d.groupby('country_tier')[col].mean().reindex(W.index)
    return float((m*W).sum())

def boot_diff(a, b, col, B=2000, adjusted=True):
    """Bootstrap CI for channel a minus channel b (resampling players within channel x tier strata)."""
    da, db = df[df.channel==a], df[df.channel==b]
    ga = {t: g[col].values for t, g in da.groupby('country_tier')}; gb = {t: g[col].values for t, g in db.groupby('country_tier')}
    out = []
    for _ in range(B):
        if adjusted:
            ma = sum(W[t]*rng.choice(ga[t], len(ga[t])).mean() for t in W.index)
            mb = sum(W[t]*rng.choice(gb[t], len(gb[t])).mean() for t in W.index)
        else:
            va = np.concatenate(list(ga.values())); vb = np.concatenate(list(gb.values()))
            ma = rng.choice(va, len(va)).mean(); mb = rng.choice(vb, len(vb)).mean()
        out.append(ma-mb)
    out = np.array(out)
    est = (std_mean(da,col)-std_mean(db,col)) if adjusted else (da[col].mean()-db[col].mean())
    lo, hi = np.percentile(out, [2.5, 97.5])
    p = 2*min((out<=0).mean(), (out>=0).mean())
    return est, lo, hi, max(p, 1/B)

rows = []
for col in ['d7_retained', 'rev30', 'payer30']:
    for a, b in [('paid_video','organic'), ('paid_social','organic'), ('paid_video','paid_social')]:
        for adj in [False, True]:
            est, lo, hi, p = boot_diff(a, b, col, adjusted=adj)
            base = std_mean(df[df.channel==b], col) if adj else df[df.channel==b][col].mean()
            rows.append(dict(metric=col, comparison=f'{a} - {b}', method='tier-adjusted' if adj else 'naive',
                             diff=est, ci_lo=lo, ci_hi=hi, rel_diff_pct=100*est/base, p_boot=p, significant=(lo>0 or hi<0)))
res = pd.DataFrame(rows); print('\nDIFFERENCES (bootstrap 95% CI)'); print(res.round(4).to_string())
res.to_csv('outputs/3_channel_differences.csv', index=False)

# Regression check: logistic D7 ~ channel + tier + platform + install_month (cluster-free, simple)
import statsmodels.formula.api as smf
m = smf.logit('d7_retained ~ C(channel) + C(country_tier) + C(platform) + C(install_month)', data=df).fit(disp=0)
print('\nLogit D7 (adjusted)'); print(m.summary2().tables[1].round(4).iloc[:4])
m2 = smf.ols('rev30 ~ C(channel) + C(country_tier) + C(platform) + C(install_month)', data=df).fit(cov_type='HC1')
print('\nOLS rev30 (robust SE)'); print(m2.summary2().tables[1].round(4).iloc[:4])

# Minimum detectable effect for rev30 (80% power, alpha .05) between paid_social and organic
sd = df.rev30.std(); n1 = (df.channel=='paid_social').sum(); n2 = (df.channel=='organic').sum()
mde = (stats.norm.ppf(.975)+stats.norm.ppf(.8))*sd*np.sqrt(1/n1+1/n2)
print(f'\nrev30 sd {sd:.2f}; MDE paid_social vs organic = ${mde:.3f} per install ({100*mde/df.rev30.mean():.0f}% of mean)')
p_d7 = df.d7_retained.mean(); mde_d7 = (stats.norm.ppf(.975)+stats.norm.ppf(.8))*np.sqrt(p_d7*(1-p_d7)*(1/n1+1/n2))
print(f'MDE D7 = {100*mde_d7:.2f} pp')
pd.DataFrame([dict(metric='rev30', sd=sd, mde=mde), dict(metric='d7', sd=np.sqrt(p_d7*(1-p_d7)), mde=mde_d7)]).to_csv('outputs/3_mde.csv', index=False)

# linked-device channel ambiguity
print('\nlinked players share by channel'); print(df.groupby('channel').n_devices.apply(lambda s: (s>1).mean()).round(4))

# ---- Chart: naive vs adjusted rev30 & D7 per channel with CIs
def ci_mean(d, col, adjusted):
    vals=[]
    g = {t: x[col].values for t, x in d.groupby('country_tier')}
    for _ in range(1000):
        if adjusted: vals.append(sum(W[t]*rng.choice(g[t], len(g[t])).mean() for t in W.index))
        else:
            v = d[col].values; vals.append(rng.choice(v, len(v)).mean())
    return np.percentile(vals, [2.5, 97.5])
fig, axes = plt.subplots(1, 2, figsize=(11, 4))
for ax, col, lab, scale in [(axes[0], 'd7_retained', 'D7 retention (%)', 100), (axes[1], 'rev30', '30-day revenue per install (USD)', 1)]:
    for j, adj in enumerate([False, True]):
        for i, ch in enumerate(CH):
            d = df[df.channel==ch]
            est = (std_mean(d,col) if adj else d[col].mean())*scale
            lo, hi = ci_mean(d, col, adj)*scale
            x = i + (j-.5)*.3
            ax.errorbar(x, est, yerr=[[est-lo],[hi-est]], fmt='o', color=[PAL[5], PAL[0]][j], capsize=4, ms=7,
                        label=['Naive', 'Tier-adjusted'][j] if i==0 else None)
    ax.set_xticks(range(3)); ax.set_xticklabels(CH); ax.set_title(lab)
axes[0].legend(frameon=False)
plt.suptitle('Channels, installs Jan–Mar 2026 (95% bootstrap CIs)', fontweight='bold')
plt.tight_layout(); plt.savefig('charts/3_channels.png', dpi=160); plt.close()
