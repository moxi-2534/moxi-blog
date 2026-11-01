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

# 可选：把仓库里的 nginx 模板渲染后同步到服务器。默认关闭，避免覆盖 certbot 写入的 SSL 段。
if ($config["DEPLOY_SYNC_NGINX"] -eq "1") {
	if (-not $config["DEPLOY_NGINX_CONF"]) { throw "DEPLOY_SYNC_NGINX=1 时必须设置 DEPLOY_NGINX_CONF" }
	if (-not $domain) { throw "DEPLOY_SYNC_NGINX=1 时必须设置 DEPLOY_DOMAIN" }
	$confPath = $config["DEPLOY_NGINX_CONF"]

	$hasSsl = (ssh @sshArgs $target "grep -qs ssl_certificate '$confPath' && echo yes || echo no" ) -join ""
	if ($hasSsl -eq "yes" -and $config["DEPLOY_FORCE_NGINX"] -ne "1") {
		Write-Host "==> skip nginx sync: $confPath 已含 certbot SSL 段（要覆盖请设 DEPLOY_FORCE_NGINX=1）" -ForegroundColor Yellow
	} else {
		Write-Host "==> sync nginx config" -ForegroundColor Cyan
		$template = Get-Content (Join-Path $PSScriptRoot "nginx.conf.template") -Raw
		$rendered = $template.Replace("__SERVER_NAME__", $domain).Replace("__WEB_ROOT__", $webRoot)
		$tmpConf = Join-Path $env:TEMP "blog-nginx.conf"
		Set-Content -Path $tmpConf -Value $rendered -NoNewline -Encoding utf8
		scp @scpArgs $tmpConf "${target}:/tmp/blog-nginx.conf"
		if ($LASTEXITCODE -ne 0) { throw "nginx config upload failed" }
		ssh @sshArgs $target "set -e; cp -n '$confPath' '$confPath.bak' 2>/dev/null || true; mv /tmp/blog-nginx.conf '$confPath'; nginx -t; systemctl reload nginx"
		if ($LASTEXITCODE -ne 0) { throw "nginx reload failed" }
		Remove-Item $tmpConf -ErrorAction SilentlyContinue
	}
}

Remove-Item $tarball
if ($domain) { Write-Host "==> done: https://$domain/" -ForegroundColor Green } else { Write-Host "==> done" -ForegroundColor Green }
