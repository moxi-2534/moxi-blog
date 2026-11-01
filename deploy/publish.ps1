# 一键发布：本地构建 -> 打包 -> 上传 -> 服务器解包 -> reload nginx
# 用法：pwsh deploy/publish.ps1
# 配置：deploy/.env（从 deploy/.env.example 复制），已加入 .gitignore
# 前提：本机公钥已写入服务器 ~/.ssh/authorized_keys
$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
	throw "缺少 $envFile —— 请先复制 deploy/.env.example 为 deploy/.env 并填写服务器信息"
}

$config = @{}
Get-Content $envFile | ForEach-Object {
	$line = $_.Trim()
	if ($line -eq "" -or $line.StartsWith("#")) { return }
	$i = $line.IndexOf("=")
	if ($i -lt 1) { return }
	$config[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1).Trim().Trim('"').Trim("'")
}

foreach ($key in @("DEPLOY_HOST", "DEPLOY_USER", "DEPLOY_PATH")) {
	if (-not $config.ContainsKey($key) -or -not $config[$key]) { throw "deploy/.env 缺少 $key" }
}

$port = if ($config["DEPLOY_PORT"]) { $config["DEPLOY_PORT"] } else { "22" }
$domain = $config["DEPLOY_DOMAIN"]
$target = "$($config['DEPLOY_USER'])@$($config['DEPLOY_HOST'])"
$webRoot = $config["DEPLOY_PATH"]
$tarball = Join-Path $env:TEMP "blog-dist.tgz"

$sshArgs = @("-p", $port)
if ($config["DEPLOY_SSH_KEY"]) { $sshArgs += @("-i", $config["DEPLOY_SSH_KEY"]) }
$scpArgs = @("-P", $port)
if ($config["DEPLOY_SSH_KEY"]) { $scpArgs += @("-i", $config["DEPLOY_SSH_KEY"]) }

Write-Host "==> build" -ForegroundColor Cyan
pnpm build
if ($LASTEXITCODE -ne 0) { throw "build failed" }

Write-Host "==> package" -ForegroundColor Cyan
if (Test-Path $tarball) { Remove-Item $tarball }
tar -czf $tarball -C dist .
if ($LASTEXITCODE -ne 0) { throw "tar failed" }

Write-Host "==> upload to $target" -ForegroundColor Cyan
scp @scpArgs $tarball "${target}:/tmp/blog-dist.tgz"
if ($LASTEXITCODE -ne 0) { throw "upload failed" }

Write-Host "==> activate" -ForegroundColor Cyan
ssh @sshArgs $target "set -e; rm -rf $webRoot/*; tar -xzf /tmp/blog-dist.tgz -C $webRoot; chown -R nginx:nginx $webRoot; nginx -t; systemctl reload nginx"
if ($LASTEXITCODE -ne 0) { throw "activate failed" }

Remove-Item $tarball
if ($domain) { Write-Host "==> done: https://$domain/" -ForegroundColor Green } else { Write-Host "==> done" -ForegroundColor Green }
