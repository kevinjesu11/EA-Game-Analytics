import duckdb
con = duckdb.connect()
for t in ['player_profile','player_day','purchase','currency_spend','ad_view']:
    con.execute(f"create view {t} as select * from read_csv_auto('csv/{t}.csv', header=true)")
def q(s): print(s.strip()[:90]); print(con.sql(s).df().to_string()); print()
for t in ['player_profile','player_day','purchase','currency_spend','ad_view']:
    q(f"summarize {t}")
