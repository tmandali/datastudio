@echo off
call .venv\Scripts\activate
echo Current Directory: %CD%
echo Starting Jupyter Lab (Auto-config mode)...
python -m jupyter lab
