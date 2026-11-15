$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
python -m venv .build-env
& .\.build-env\Scripts\python.exe -m pip install -r requirements.txt
& .\.build-env\Scripts\python.exe -m PyInstaller --noconfirm --clean --onefile --windowed --name FairytaleLab --icon "$PSScriptRoot\assets\mouse.ico" --add-data "$PSScriptRoot\web;web" --collect-all webview --collect-all pythonnet --distpath dist --workpath .build --specpath .build launcher.py
Write-Output 'Built: dist\FairytaleLab.exe'
