# 一键发布：本地构建 -> 打包 -> 上传 -> 服务器解包 -> reload nginx
# 用法：pwsh deploy/publish.ps1   （首次需已把本机公钥装入服务器 authorized_keys）
$ErrorActionPreference = "Stop"

$Target = "root@203.0.113.10"
$WebRoot = "/var/www/blog"
$Tarball = Join-Path $env:TEMP "blog-dist.tgz"

Write-Host "==> build" -ForegroundColor Cyan
pnpm build
if ($LASTEXITCODE -ne 0) { throw "build failed" }

Write-Host "==> package" -ForegroundColor Cyan
if (Test-Path $Tarball) { Remove-Item $Tarball }
tar -czf $Tarball -C dist .
if ($LASTEXITCODE -ne 0) { throw "tar failed" }

Write-Host "==> upload" -ForegroundColor Cyan
scp $Tarball "${Target}:/tmp/blog-dist.tgz"
if ($LASTEXITCODE -ne 0) { throw "upload failed" }

Write-Host "==> activate" -ForegroundColor Cyan
ssh $Target "set -e; rm -rf $WebRoot/*; tar -xzf /tmp/blog-dist.tgz -C $WebRoot; chown -R nginx:nginx $WebRoot; nginx -t; systemctl reload nginx"
if ($LASTEXITCODE -ne 0) { throw "activate failed" }

Remove-Item $Tarball
Write-Host "==> done: https://blog.moxi2534.com/" -ForegroundColor Green
