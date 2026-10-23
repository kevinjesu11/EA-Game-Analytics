"""Tiny helper: open DuckDB, run the setup script, run any .sql file, return DataFrames."""
import duckdb, re, pathlib
import os
ROOT = pathlib.Path(__file__).parent
# Where the five CSVs live: $EA_CSV_DIR, else ./csv, ./data/csv, or the same one or two folders up
_CANDIDATES = ['csv', 'data/csv', 'csv_data/csv', '../csv', '../data/csv', '../../data/csv',
               '../Analytics Intern Assignment/Analytics Intern Assignment/data/csv',  # the assignment folder next to this one in Downloads
               '../Analytics Intern Assignment/data/csv']
CSV_DIR = os.environ.get('EA_CSV_DIR') or next((d for d in _CANDIDATES if (ROOT/d/'purchase.csv').exists()), 'csv')
if not (ROOT/CSV_DIR/'purchase.csv').exists():
    raise SystemExit(f"Could not find the CSV files. Put the csv folder next to this file, or set EA_CSV_DIR. Looked in: {_CANDIDATES}")
def connect():
    con = duckdb.connect()
    run_file(con, 'sql/00_setup_clean.sql')
    return con
def statements(path):
    txt = (ROOT/path).read_text(encoding='utf-8')
    txt = re.sub(r'--[^\n]*', '', txt)
    txt = txt.replace("'csv/", f"'{(ROOT/CSV_DIR).as_posix()}/")
    return [s.strip() for s in txt.split(';') if s.strip()]
def run_file(con, path):
    """Runs all statements; returns the result of the last SELECT."""
    res = None
    for s in statements(path):
        r = con.execute(s)
        if s.lstrip().upper().startswith(('SELECT','WITH')):
            res = r.df()
    return res
