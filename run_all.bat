@echo off
REM Windows version of run_all.sh. Double-click it, or run "run_all.bat" in Command Prompt from this folder.
cd /d "%~dp0"
set PYTHONUTF8=1
echo [1/6] Installing Python libraries...
python -m pip install -q -r requirements.txt || goto :error
if not exist outputs mkdir outputs
if not exist charts mkdir charts
echo [2/6] Task 1 ...
python task1_run.py > outputs\task1_log.txt || goto :error
echo [3/6] Task 2 ...
python task2_arpdau.py > outputs\task2_log.txt || goto :error
echo [4/6] Task 3 ...
python task3_channels.py > outputs\task3_log.txt || goto :error
echo [5/6] Task 4 (takes about a minute) ...
python task4_churn.py > outputs\task4_log.txt 2>&1 || goto :error
echo [6/6] Collecting numbers for the deck ...
python deck_data.py || goto :error
echo.
echo SUCCESS - all tasks ran. Results are in the outputs and charts folders.
pause
exit /b 0
:error
echo.
echo FAILED at the step above. Open the matching file in outputs\ to see the error.
pause
exit /b 1
