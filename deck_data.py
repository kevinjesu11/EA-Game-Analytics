"""Collects the numbers the deck needs from outputs/*.csv into deck/data.json (so every figure in the deck is traceable)."""
import pandas as pd, json
o = lambda f: pd.read_csv(f'outputs/{f}')
d = {}
daily = o('1a_daily_health.csv'); daily['day']=pd.to_datetime(daily.day)
wk = daily.assign(w=daily.day.dt.to_period('W-SUN').dt.start_time).groupby(['w','platform']).agg(dau=('dau','sum'), rev=('gross_revenue','sum'), payers=('active_payers','sum'), ndays=('day','nunique')).reset_index()
wk['arpdau']=wk.rev/wk.dau; wk['payer_share']=100*wk.payers/wk.dau
d['weekly'] = {p: {'labels':[x.strftime('%d %b') for x in g.w], 'dau':(g.dau/g.ndays).round(0).tolist(), 'arpdau':g.arpdau.round(3).tolist(), 'payer':g.payer_share.round(2).tolist()} for p,g in wk.groupby('platform')}
plat = daily.groupby('platform').agg(pdays=('dau','sum'), gross=('gross_revenue','sum'), net=('net_revenue','sum'), payers=('active_payers','sum'))
plat['arpdau']=plat.gross/plat.pdays; plat['payer_share']=100*plat.payers/plat.pdays
d['platform'] = plat.round(3).reset_index().to_dict('records')
d['totals'] = dict(gross=float(daily.gross_revenue.sum()), net=float(daily.net_revenue.sum()), pdays=int(daily.dau.sum()),
                   payer_share=float(100*daily.active_payers.sum()/daily.dau.sum()), arpdau=float(daily.gross_revenue.sum()/daily.dau.sum()))
d['retention'] = o('1b_retention.csv').where(lambda x: x.notna(), None).to_dict('records')
d['weekly_ret'] = o('1b_weekly_retention.csv').where(lambda x: x.notna(), None).to_dict('records')
d['concentration'] = o('1c_concentration.csv').to_dict('records')
d['first_purchase'] = o('1c_first_purchase.csv').to_dict('records')
d['repeat_gap'] = o('1c_repeat_gap.csv').to_dict('records')[0]
d['cap'] = o('1d_cap_hit.csv').where(lambda x: x.notna(), None).to_dict('records')
ads = o('1d_daily_ads.csv'); d['ads'] = {'labels': [pd.Timestamp(x).strftime('%d %b') for x in ads.day], 'completed': ads.completed_views.tolist(), 'per_dau': ads.completed_per_dau.tolist()}
d['tier'] = o('2a_by_tier.csv').to_dict('records')
d['decomp'] = o('2a_decomposition.csv').to_dict('records')
d['installs_tier'] = o('2a_installs_by_tier.csv').to_dict('records')
d['ltv'] = o('2a_ltv_by_tier.csv').where(lambda x: x.notna(), None).to_dict('records')
d['val30'] = o('2a_value_per_install.csv').to_dict('records')
d['ch_diff'] = o('3_channel_differences.csv').to_dict('records')
cc = o('3_channel_cohort.csv')
d['ch_naive'] = cc.groupby('channel').agg(n=('player_id','size'), d7=('d7_retained','mean'), rev30=('rev30','mean'), payer=('payer30','mean')).round(4).reset_index().to_dict('records')
d['ch_mix'] = (pd.crosstab(cc.channel, cc.country_tier, normalize='index')*100).round(1).reset_index().to_dict('records')
d['mde'] = o('3_mde.csv').to_dict('records')
d['return_curve'] = o('4_return_curve.csv').to_dict('records')
d['coef'] = o('4_coefficients.csv').to_dict('records')
d['thr'] = o('4_thresholds.csv').to_dict('records')
d['deciles'] = o('4_deciles.csv').to_dict('records')
d['segments'] = o('4_segments.csv').rename(columns={'Unnamed: 0':'seg'}).to_dict('records')
d['econ'] = o('4_economics.csv').where(lambda x: x.notna(), None).to_dict('records')
import math
def clean(x):
    if isinstance(x, dict): return {str(k): clean(v) for k, v in x.items()}
    if isinstance(x, list): return [clean(v) for v in x]
    if isinstance(x, float) and math.isnan(x): return None
    if hasattr(x, 'item'): return clean(x.item())
    if isinstance(x, pd.Timestamp): return str(x.date())
    return x
json.dump(clean(d), open('deck/data.json','w'), indent=1, default=str, allow_nan=False)
print('ok', list(d))
