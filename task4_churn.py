"""Task 4: 14-day churn prediction with logistic regression, time-based split."""
import run_sql, pandas as pd, numpy as np, matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score, average_precision_score, precision_recall_curve, brier_score_loss
from style import apply_style, C as PAL
apply_style(); pd.set_option('display.width', 220)
con = run_sql.connect()
print(run_sql.run_file(con, 'sql/4a_return_curve.sql').to_string()); 
run_sql.run_file(con, 'sql/4a_return_curve.sql').to_csv('outputs/4_return_curve.csv', index=False)
run_sql.run_file(con, 'sql/4b_churn_features.sql')
df = con.sql('select * from churn_table').df()
df['s'] = pd.to_datetime(df.s)
df = df.sort_values(['s','player_id']).reset_index(drop=True)  # deterministic row order

# ---- feature engineering (all known at snapshot s)
for c in ['sessions_7','playtime_7','playtime_28','rev_28','ads_completed_7','spends_7','age_days']:
    df['log_'+c] = np.log1p(df[c].clip(lower=0))
df['trend_active'] = df.active_days_7 - (df.active_days_28 - df.active_days_7)/3   # this week vs avg of previous 3
df['new_player'] = (df.age_days < 14).astype(int)
# Chosen model: 8 behavioural features + 3 categorical. A 15-feature version (adding sessions, 7d playtime,
# level gain, revenue, spend events, 28d active days) scored AUC 0.754 vs 0.747 here, but its coefficients
# flip sign through collinearity and cannot be explained - not worth 0.007 AUC.
NUM_FULL = ['days_since_last','active_days_7','active_days_28','trend_active','log_sessions_7','log_playtime_7','log_playtime_28',
       'level','level_gain_28','log_age_days','new_player','payer_ever','log_rev_28','log_ads_completed_7','log_spends_7']
NUM = ['days_since_last','active_days_7','trend_active','log_playtime_28','level','log_age_days','payer_ever','log_ads_completed_7']
CAT = ['country_tier','platform','acquisition_channel']

# ---- time-based split: labels of train must be fully observed before the test snapshots
train = df[df.s <= '2026-03-19']; test = df[df.s >= '2026-04-02']
print(f"\ntrain {len(train)} rows ({train.s.min().date()}..{train.s.max().date()}), churn {train.churn14.mean():.3f}")
print(f"test  {len(test)} rows ({test.s.min().date()}..{test.s.max().date()}), churn {test.churn14.mean():.3f}")

pre = ColumnTransformer([('num', StandardScaler(), NUM), ('cat', OneHotEncoder(drop='first'), CAT)])
model = Pipeline([('pre', pre), ('lr', LogisticRegression(max_iter=2000, C=1.0))])
model.fit(train[NUM+CAT], train.churn14)
p = model.predict_proba(test[NUM+CAT])[:,1]; test = test.assign(p=p)
y = test.churn14.values

names = NUM + list(model.named_steps['pre'].named_transformers_['cat'].get_feature_names_out(CAT))
coef = pd.DataFrame({'feature': names, 'coef_per_sd': model.named_steps['lr'].coef_[0]})
coef['odds_ratio'] = np.exp(coef.coef_per_sd); coef = coef.reindex(coef.coef_per_sd.abs().sort_values(ascending=False).index)
print('\nCoefficients (standardised)'); print(coef.round(3).to_string(index=False)); coef.to_csv('outputs/4_coefficients.csv', index=False)

# baselines
base_rule = -test.active_days_7   # "fewer active days this week = more likely to churn"
auc, ap = roc_auc_score(y, p), average_precision_score(y, p)
print(f"\nTEST  AUC {auc:.3f} | PR-AUC {ap:.3f} (base rate {y.mean():.3f}) | Brier {brier_score_loss(y,p):.4f}")
print(f"Baseline rule (active_days_7 only): AUC {roc_auc_score(y, base_rule):.3f}  PR-AUC {average_precision_score(y, base_rule):.3f}")
full = Pipeline([('pre', ColumnTransformer([('num', StandardScaler(), NUM_FULL), ('cat', OneHotEncoder(drop='first'), CAT)])),
                 ('lr', LogisticRegression(max_iter=2000))]).fit(train[NUM_FULL+CAT], train.churn14)
print(f"15-feature model for comparison: AUC {roc_auc_score(y, full.predict_proba(test[NUM_FULL+CAT])[:,1]):.3f}")
print('\nChurn rate by player age (all snapshots)'); print(df.groupby(pd.cut(df.age_days,[-1,6,13,29,59,119,400])).churn14.agg(['size','mean']).round(3))
train_auc = roc_auc_score(train.churn14, model.predict_proba(train[NUM+CAT])[:,1]); print(f"train AUC {train_auc:.3f}")

# threshold table
rows=[]
for t in [0.1,0.15,0.2,0.25,0.3,0.4,0.5,0.6]:
    sel = p >= t
    tp = (sel & (y==1)).sum()
    rows.append(dict(threshold=t, pct_targeted=100*sel.mean(), precision=tp/max(sel.sum(),1), recall=tp/(y==1).sum(),
                     offers_per_1000=1000*sel.mean(), wasted_per_1000=1000*(sel & (y==0)).mean()))
thr = pd.DataFrame(rows); print('\nThreshold table (test)'); print(thr.round(3).to_string(index=False)); thr.to_csv('outputs/4_thresholds.csv', index=False)

# lift by decile + calibration
test['decile'] = pd.qcut(test.p.rank(method='first'), 10, labels=False)
dec = test.groupby('decile').agg(n=('p','size'), mean_pred=('p','mean'), actual=('churn14','mean')).iloc[::-1]
dec['lift'] = dec.actual/y.mean(); print('\nDeciles (top first)'); print(dec.round(3).to_string()); dec.to_csv('outputs/4_deciles.csv')

# where it works badly: segment AUC
def seg_auc(g): 
    return pd.Series({'n': len(g), 'churn_rate': g.churn14.mean(), 'auc': roc_auc_score(g.churn14, g.p) if g.churn14.nunique()>1 else np.nan,
                      'mean_pred': g.p.mean()})
segs = []
for col in ['new_player','payer_ever','country_tier','platform','active_days_7']:
    s = test.groupby(col).apply(seg_auc); s.index = [f'{col}={i}' for i in s.index]; segs.append(s)
segs = pd.concat(segs); print('\nSegment performance'); print(segs.round(3).to_string()); segs.to_csv('outputs/4_segments.csv')
print('\nAUC by test snapshot'); print(test.groupby('s').apply(lambda g: roc_auc_score(g.churn14, g.p)).round(3))

# ---- economics: target if p * uplift * V > cost  ->  threshold = cost / (uplift * V)
econ=[]
for V in [2, 5, 10]:
    for cost in [0.10, 0.50, 1.00]:
        for u in [0.1, 0.2]:
            t = cost/(u*V)
            sel = p >= t
            val = (p[sel]*u*V - cost).sum()*1000/len(p)
            econ.append(dict(value_retained_player=V, offer_cost=cost, uplift=u, threshold=round(t,3), pct_targeted=100*sel.mean(),
                             precision=(y[sel]==1).mean() if sel.any() else np.nan, exp_net_value_per_1000_active=val))
econ = pd.DataFrame(econ); print('\nEconomics'); print(econ.round(3).to_string(index=False)); econ.to_csv('outputs/4_economics.csv', index=False)

# ---- charts
prec, rec, th = precision_recall_curve(y, p)
fig, ax = plt.subplots(1, 2, figsize=(11, 4))
ax[0].plot(rec, prec, color=PAL[0]); ax[0].axhline(y.mean(), ls='--', color='#999'); ax[0].text(0.62, y.mean()+.02, f'random = {y.mean():.2f}', color='#666')
for t in [0.2, 0.3, 0.5]:
    r = thr[thr.threshold==t].iloc[0]; ax[0].plot(r.recall, r.precision, 'o', color=PAL[3]); ax[0].annotate(f'p≥{t}: target {r.pct_targeted:.0f}%', (r.recall, r.precision), xytext=(6,6), textcoords='offset points', fontsize=8.5)
ax[0].set_xlabel('recall (share of churners reached)'); ax[0].set_ylabel('precision'); ax[0].set_title(f'Precision–recall, test Apr 2–16 (AUC {auc:.2f})')
ax[1].bar(range(10), dec.actual.values*100, color=PAL[0]); ax[1].plot(range(10), dec.mean_pred.values*100, 'o-', color=PAL[1], label='predicted')
ax[1].set_xticks(range(10)); ax[1].set_xticklabels([f'D{i}' for i in range(1,11)]); ax[1].set_ylabel('% churned in next 14d')
ax[1].set_title('Actual churn by risk decile (D1 = highest risk)'); ax[1].legend(frameon=False)
plt.tight_layout(); plt.savefig('charts/4_churn.png', dpi=160); plt.close()
test[['s','player_id','p','churn14']].to_csv('outputs/4_test_predictions.csv', index=False)
