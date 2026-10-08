@echo off
cd /d "%~dp0.."
if not exist dados-locais mkdir dados-locais
echo ==== %date% %time% ==== >> dados-locais\atualizacao.log
node scripts\motor-busca.mjs >> dados-locais\atualizacao.log 2>&1
echo codigo de saida: %errorlevel% >> dados-locais\atualizacao.log
