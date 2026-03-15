@echo off
REM Run from project root: python-pipeline\run_pipeline.bat
REM Or from python-pipeline: run_pipeline.bat
cd /d "%~dp0.."
py -3.11 python-pipeline\main_pipeline.py
pause
