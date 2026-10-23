#!/usr/bin/env bash
# Re-runs every analysis from the raw CSVs, then rebuilds the deck.
# CSVs are read from ./csv, ./data/csv, or $EA_CSV_DIR.
set -e
cd "$(dirname "$0")"
pip install -q -r requirements.txt
mkdir -p outputs charts
python3 task1_run.py      > outputs/task1_log.txt
python3 task2_arpdau.py   > outputs/task2_log.txt
python3 task3_channels.py > outputs/task3_log.txt
python3 task4_churn.py    > outputs/task4_log.txt 2>&1
python3 deck_data.py
# Deck (optional, needs Node.js):  npm install pptxgenjs && node deck/build_deck.js
if command -v node >/dev/null && node -e "require('pptxgenjs')" 2>/dev/null; then node deck/build_deck.js; fi
echo "Done. Tables in outputs/, charts in charts/."
