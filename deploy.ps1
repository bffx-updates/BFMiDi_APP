$appDir  = $PSScriptRoot
$repoDir = Split-Path $appDir -Parent
$swFile  = Join-Path $appDir "sw.js"

# Le versao atual
$content = Get-Content $swFile -Raw
if ($content -match 'bfmidi-wifi-v(\d+)') {
    $ver    = [int]$Matches[1]
    $newVer = $ver + 1
} else {
    Write-Host "ERRO: nao encontrei CACHE_NAME no sw.js" -ForegroundColor Red
    exit 1
}

# Atualiza sw.js
$content = $content -replace "bfmidi-wifi-v$ver", "bfmidi-wifi-v$newVer"
Set-Content $swFile $content -NoNewline
Write-Host "Versao: v$ver -> v$newVer" -ForegroundColor Cyan

# Commit no repo pai
Set-Location $repoDir
git add bfmidi-wifi-app/
git commit -m "deploy v$newVer"

# Publica subpasta como raiz
git subtree split --prefix bfmidi-wifi-app -b tmp-deploy
git push origin tmp-deploy:main --force
git branch -D tmp-deploy

Write-Host ""
Write-Host "Publicado! Aguarde ~1 minuto e o app atualiza sozinho." -ForegroundColor Green
