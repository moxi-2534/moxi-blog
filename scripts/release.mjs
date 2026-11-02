// pnpm release —— 构建并发布到 deploy/.env 里的目标服务器
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ENV_FILE = join(ROOT, "deploy", ".env");

function fail(msg) {
	console.error(msg);
	process.exit(1);
}

function run(cmd, args, opts = {}) {
	const r = spawnSync(cmd, args, { stdio: "inherit", cwd: ROOT, ...opts });
	if (r.error) fail(`失败：${cmd}（${r.error.message}）`);
	if (r.status !== 0) fail(`失败：${cmd} ${args.join(" ")}`);
	return r;
}

function readEnv() {
	if (!existsSync(ENV_FILE)) fail("缺少 deploy/.env（参照 deploy/.env.example）");
	const env = {};
	for (const raw of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;
		const i = line.indexOf("=");
		if (i < 1) continue;
		env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
	}
	for (const key of ["DEPLOY_HOST", "DEPLOY_USER", "DEPLOY_PATH", "DEPLOY_SSH_KEY"]) {
		if (!env[key]) fail(`deploy/.env 缺少 ${key}`);
	}
	return env;
}

const cfg = readEnv();
const port = cfg.DEPLOY_PORT || "22";
const target = `${cfg.DEPLOY_USER}@${cfg.DEPLOY_HOST}`;
const webRoot = cfg.DEPLOY_PATH;
const sshOpts = ["-i", cfg.DEPLOY_SSH_KEY, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new"];

const tmp = mkdtempSync(join(tmpdir(), "blog-release-"));

try {
	console.log("==> build");
	if (process.platform === "win32") {
		const r = spawnSync("pnpm build", { stdio: "inherit", cwd: ROOT, shell: true });
		if (r.status !== 0) fail("失败：pnpm build");
	} else {
		run("pnpm", ["build"]);
	}

	console.log("==> package");
	run("tar", ["-czf", "dist.tgz", "-C", join(ROOT, "dist"), "."], { cwd: tmp });

	console.log(`==> upload -> ${target}`);
	run("scp", ["-P", port, ...sshOpts, "dist.tgz", `${target}:/tmp/blog-dist.tgz`], { cwd: tmp });

	console.log("==> activate");
	run("ssh", [
		"-p", port, ...sshOpts, target,
		`set -e; rm -rf ${webRoot}/*; tar -xzf /tmp/blog-dist.tgz -C ${webRoot}; chown -R nginx:nginx ${webRoot}; nginx -t; systemctl reload nginx`,
	]);

	if (cfg.DEPLOY_SYNC_NGINX === "1") syncNginx();

	if (cfg.DEPLOY_DOMAIN) console.log(`==> done: https://${cfg.DEPLOY_DOMAIN}/`);
} finally {
	rmSync(tmp, { recursive: true, force: true });
}

// 可选：把 nginx.conf.template 渲染后装到服务器；目标文件已含证书配置时默认不覆盖
function syncNginx() {
	const confPath = cfg.DEPLOY_NGINX_CONF;
	if (!confPath) fail("DEPLOY_SYNC_NGINX=1 需要 DEPLOY_NGINX_CONF");
	if (!cfg.DEPLOY_DOMAIN) fail("DEPLOY_SYNC_NGINX=1 需要 DEPLOY_DOMAIN");

	const probe = spawnSync("ssh", [...sshOpts, "-p", port, target, `grep -qs ssl_certificate ${confPath} && echo yes || echo no`], { encoding: "utf8" });
	if (probe.stdout?.trim() === "yes" && cfg.DEPLOY_FORCE_NGINX !== "1") {
		console.log(`==> skip nginx sync: ${confPath} 已有证书配置（DEPLOY_FORCE_NGINX=1 可强制覆盖）`);
		return;
	}

	console.log("==> sync nginx config");
	const rendered = readFileSync(join(ROOT, "deploy", "nginx.conf.template"), "utf8")
		.replaceAll("__SERVER_NAME__", cfg.DEPLOY_DOMAIN)
		.replaceAll("__WEB_ROOT__", webRoot);
	const localConf = join(tmp, "nginx.conf");
	writeFileSync(localConf, rendered);
	run("scp", ["-P", port, ...sshOpts, "nginx.conf", `${target}:/tmp/blog-nginx.conf`], { cwd: tmp });
	run("ssh", ["-p", port, ...sshOpts, target, `set -e; cp -n ${confPath} ${confPath}.bak 2>/dev/null || true; mv /tmp/blog-nginx.conf ${confPath}; nginx -t; systemctl reload nginx`]);
}
