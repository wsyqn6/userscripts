#!/usr/bin/env bun
/**
 * 轻量 CDP 桥：用系统浏览器（Edge/Chrome）调试油猴脚本，无需 Tampermonkey 安装。
 *
 * 用法：
 *   bun dev/cdp.js up [url]                        启动带调试端口的浏览器
 *   bun dev/cdp.js tabs                            列出标签页
 *   bun dev/cdp.js run <url> --inject <file>       新开标签并注入脚本源码
 *   bun dev/cdp.js inject <file> [--url <substr>]  向现有标签注入脚本并重载
 *   bun dev/cdp.js eval "<js>" [--url <substr>]    在页面里求值
 *   bun dev/cdp.js shot <out.png> [--url <substr>] 截图
 *   bun dev/cdp.js key <键> [--times n]            发送真实按键
 *
 * 常用参数：
 *   --port <n>        调试端口，默认 9222（或环境变量 CDP_PORT）
 *   --target <id>     按标签页 targetId 前缀精确定位（多个同类页面时用）
 *   --profile <p>     浏览器配置目录，默认 default（当前用户的真实 profile）
 *                     default | debug | 任意绝对路径
 *   --browser <p>     指定浏览器可执行文件，默认自动探测 Edge / Chrome
 *   --wait <ms>       页面加载后额外等待，默认 2500
 *   --eval "<js>"     run 完成后追加一次求值
 */

const CDP_PORT = Number(process.env.CDP_PORT || 9222);
const HOST = '127.0.0.1';
import { openSync, mkdirSync } from 'node:fs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ==================== 参数解析 ====================
const argv = Bun.argv.slice(2);
const cmd = argv[0];
const flags = {};
const positional = [];
for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
        const next = argv[i + 1];
        if (next === undefined || next.startsWith('--')) flags[a.slice(2)] = true;
        else { flags[a.slice(2)] = next; i++; }
    } else positional.push(a);
}
const port = Number(flags.port || CDP_PORT);
const waitMs = Number(flags.wait ?? 2500);
const BASE = `http://${HOST}:${port}`;

// ==================== 浏览器探测与启动 ====================
const localAppData = process.env.LOCALAPPDATA || '';

const BROWSERS = [
    { name: 'Edge', exe: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', root: `${localAppData}/Microsoft/Edge/User Data` },
    { name: 'Edge', exe: 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', root: `${localAppData}/Microsoft/Edge/User Data` },
    { name: 'Chrome', exe: 'C:/Program Files/Google/Chrome/Application/chrome.exe', root: `${localAppData}/Google/Chrome/User Data` },
    { name: 'Chrome', exe: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', root: `${localAppData}/Google/Chrome/User Data` }
];

// 读取 User Data/Local State，列出该浏览器下的所有 profile（含登录账号）
const readProfiles = async root => {
    const f = Bun.file(`${root}/Local State`);
    if (!(await f.exists())) return [];
    try {
        const state = await f.json();
        const cache = state?.profile?.info_cache || {};
        const lastUsed = state?.profile?.last_used;
        return Object.entries(cache).map(([dir, v]) => ({
            dir, name: v.name || dir, user: v.user_name || '', lastUsed: dir === lastUsed
        }));
    } catch {
        return [];
    }
};

// 克隆根目录：136+ 禁止在默认 user-data-dir 上开调试端口，只能复制一份
const cloneRoot = b => `${localAppData}/cdp-profiles/${b.name.toLowerCase()}`;
const debugRoot = b => `${localAppData}/cdp-profiles/${b.name.toLowerCase()}-debug`;

const COPY_EXCLUDES = ['Cache', 'Code Cache', 'GPUCache', 'ShaderCache', 'GrShaderCache', 'DawnCache', 'GraphiteDawnCache', 'Crashpad', 'Service Worker', 'CacheStorage', 'Dictionaries', 'component_crx_cache'];

// 解析要用的 profile：--profile-dir 直选，--account 按登录邮箱选，否则沿用浏览器上次使用的
const resolveLaunch = async b => {
    const p = flags.profile;
    if (p === 'clone') return await cloneLaunch(b);
    if (p && p !== 'debug' && p !== 'default') return { root: p, dir: flags['profile-dir'] || null, label: p };

    // 默认：独立 profile。真实 profile 在 136+ 上既不能直接开调试端口，
    // 复制/联接后 App-Bound Encryption 也会让 Cookies 失效，只能登录一次。
    const picked = await pickProfileDir(b);
    return { root: debugRoot(b), dir: null, label: `独立调试 profile（目标账号 ${picked.label}，首次需手动登录）` };
};

const pickProfileDir = async b => {
    const profiles = await readProfiles(b.root);
    let dir = flags['profile-dir'] || null;
    let label = dir || '';
    if (!dir && flags.account) {
        const hit = profiles.find(x => x.user.toLowerCase() === String(flags.account).toLowerCase());
        if (!hit) {
            const list = profiles.map(x => `${x.dir} (${x.user || '未登录'})`).join('、') || '（读取不到 profile 列表）';
            throw new Error(`没有找到账号 ${flags.account}，可用：${list}`);
        }
        dir = hit.dir;
        label = `${hit.name} / ${hit.user}`;
    }
    if (!dir) {
        const last = profiles.find(x => x.lastUsed) || profiles[0];
        if (last) { dir = last.dir; label = `${last.name} / ${last.user || '未登录'}`; }
    }
    return { dir, label: label || '默认' };
};

const cloneLaunch = async b => {
    const picked = await pickProfileDir(b);
    return {
        root: cloneRoot(b),
        dir: picked.dir,
        label: `克隆自 ${picked.label}`,
        cloneFrom: { root: b.root, dir: picked.dir }
    };
};

const browserRunning = async exeName => {
    try {
        const p = Bun.spawn(['tasklist', '/FI', `IMAGENAME eq ${exeName}`, '/NH'], { stdout: 'pipe', stderr: 'ignore' });
        const out = await new Response(p.stdout).text();
        return out.toLowerCase().includes(exeName.toLowerCase());
    } catch {
        return false;
    }
};

const cloneProfile = async (launch, b) => {
    if (!launch.cloneFrom) return false;
    const marker = `${launch.root}/.cdp-cloned`;
    if (!flags['refresh-clone'] && await Bun.file(marker).exists()) return false;
    if (await browserRunning(b.exe.split('/').pop())) {
        throw new Error(
            `${b.name} 正在运行，Cookies 被占用无法克隆。\n` +
            `请完全退出 ${b.name}（含托盘/后台进程）后重试；\n` +
            `或改用 --profile debug 启动一个独立实例，在实例里手动登录一次。`
        );
    }

    const { root: srcRoot, dir } = launch.cloneFrom;
    const ls = Bun.file(`${srcRoot}/Local State`);
    if (await ls.exists()) await Bun.write(`${launch.root}/Local State`, ls);

    const args = ['robocopy', `${srcRoot}/${dir}`, `${launch.root}/${dir}`, '/E', '/R:1', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', '/NP',
        ...COPY_EXCLUDES.flatMap(x => ['/XD', x])];
    const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });
    const code = await proc.exited;
    if (code >= 8) {
        const out = await new Response(proc.stdout).text();
        const locked = /0x00000020|being used by another process|另一个程序正在使用/i.test(out);
        throw new Error(
            `复制 profile 失败 (robocopy ${code})。` +
            (locked ? '\nCookies 等文件被占用——请完全退出 Edge（含托盘/后台进程）后重试。' : `\n${out.slice(-800)}`)
        );
    }
    await Bun.write(marker, new Date().toISOString());
    return true;
};

const pickBrowser = async () => {
    if (flags.browser) return { name: 'custom', exe: flags.browser, root: flags.profile && flags.profile !== 'default' && flags.profile !== 'debug' ? flags.profile : '' };
    for (const b of BROWSERS) if (await Bun.file(b.exe).exists()) return b;
    throw new Error('未找到 Edge 或 Chrome，可用 --browser 指定可执行文件路径');
};

const httpJson = async path => (await fetch(BASE + path)).json();

const isUp = async () => {
    try { await httpJson('/json/version'); return true; } catch { return false; }
};

let lastLaunch = null;

const ensureBrowser = async () => {
    if (await isUp()) return false;
    const b = await pickBrowser();
    const launch = await resolveLaunch(b);
    lastLaunch = { browser: b.name, ...launch };
    const cloned = await cloneProfile(launch, b);
    if (cloned) console.log(`已克隆 profile 到 ${launch.root}/${launch.dir}`);
    const args = [b.exe, `--remote-debugging-port=${port}`, `--user-data-dir=${launch.root}`, '--no-first-run', '--no-default-browser-check'];
    if (launch.dir) args.push(`--profile-directory=${launch.dir}`);
    const logPath = `${launch.root}/cdp-browser.log`;
    mkdirSync(launch.root, { recursive: true });
    const fd = openSync(logPath, 'a');
    // Windows 下必须完全脱离父进程，否则 bun 退出会带走浏览器
    const spawnArgs = process.platform === 'win32'
        ? ['cmd', '/c', 'start', '""', b.exe, ...args.slice(1)]
        : args;
    const proc = Bun.spawn(spawnArgs, { stdout: fd, stderr: fd, stdin: 'ignore' });
    proc.unref?.();
    for (let i = 0; i < 40; i++) {
        await sleep(250);
        if (await isUp()) break;
    }
    // 浏览器可能因更新/首次运行自我重启，端口会短暂消失
    await sleep(1200);
    if (await isUp()) return true;
    throw new Error(
        `调试端口 ${port} 未能就绪。日志：${logPath}\n` +
        `常见原因：\n` +
        `  1. 调试实例已在运行但端口不同——先关掉它，或用同一个 --port\n` +
        `  2. profile 被占用：${launch.root}${launch.dir ? ` [${launch.dir}]` : ''}\n` +
        `  3. 端口被其它程序占用：换 --port`
    );
};

// ==================== CDP 客户端 ====================
class Cdp {
    static async connect(wsUrl) {
        const ws = new WebSocket(wsUrl);
        await new Promise((resolve, reject) => {
            ws.addEventListener('open', resolve, { once: true });
            ws.addEventListener('error', () => reject(new Error(`无法连接 CDP: ${wsUrl}`)), { once: true });
        });
        return new Cdp(ws);
    }

    constructor(ws) {
        this.ws = ws;
        this.seq = 0;
        this.pending = new Map();
        this.listeners = new Set();
        ws.addEventListener('message', e => {
            let msg;
            try { msg = JSON.parse(e.data); } catch { return; }
            if (msg.id) {
                const p = this.pending.get(msg.id);
                if (!p) return;
                this.pending.delete(msg.id);
                clearTimeout(p.timer);
                msg.error ? p.reject(new Error(`${msg.error.message} (${p.method})`)) : p.resolve(msg.result);
            } else {
                for (const fn of this.listeners) fn(msg);
            }
        });
    }

    send(method, params = {}, sessionId, timeout = 15000) {
        const id = ++this.seq;
        const payload = { id, method, params };
        if (sessionId) payload.sessionId = sessionId;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`CDP 超时: ${method}`));
            }, timeout);
            this.pending.set(id, { resolve, reject, timer, method });
            this.ws.send(JSON.stringify(payload));
        });
    }

    on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    close() { try { this.ws.close(); } catch {} }
}

const browserCdp = async () => {
    await ensureBrowser();
    const { webSocketDebuggerUrl } = await httpJson('/json/version');
    return Cdp.connect(webSocketDebuggerUrl);
};

// 后台建标签：默认不抢焦点，调试时不会把浏览器窗口弹到前台。
// 旧版内核不认 background 参数，降级为普通创建。
const createTarget = async (cdp, url) => {
    try {
        return await cdp.send('Target.createTarget', { url, background: true });
    } catch {
        return await cdp.send('Target.createTarget', { url });
    }
};

const attachPage = async (cdp, filter) => {
    const { targetInfos } = await cdp.send('Target.getTargets');
    const pages = targetInfos.filter(t => t.type === 'page');
    // --target <targetId 前缀>：多个同类标签页时精确定位
    const target = flags.target
        ? pages.find(t => t.targetId.startsWith(String(flags.target)))
        : filter
            ? pages.find(t => t.url.includes(filter) || t.title?.includes(filter))
            : pages.find(t => t.url.startsWith('http')) || pages[0];
    if (!target) throw new Error(filter ? `没有匹配 "${filter}" 的标签页` : '没有可用的标签页，先执行 bun dev/cdp.js up <url>');
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    return { sessionId, target };
};

// 收集 console 与未捕获异常
const collectLogs = (cdp, sessionId) => {
    const logs = [];
    const fmt = arg => arg.value ?? arg.description ?? arg.unserializableValue ?? arg.type;
    const off = cdp.on(msg => {
        if (msg.sessionId !== sessionId) return;
        if (msg.method === 'Runtime.consoleAPICalled') {
            logs.push(`[${msg.params.type}] ${msg.params.args.map(fmt).join(' ')}`);
        } else if (msg.method === 'Runtime.exceptionThrown') {
            const d = msg.params.exceptionDetails;
            logs.push(`[exception] ${d.exception?.description || d.text}`);
        }
    });
    return { logs, off };
};

const waitLoad = (cdp, sessionId, extra) => new Promise(resolve => {
    let done = false;
    const finish = async () => {
        if (done) return;
        done = true;
        off();
        await sleep(extra);
        resolve();
    };
    const off = cdp.on(msg => {
        if (msg.sessionId === sessionId && msg.method === 'Page.loadEventFired') finish();
    });
    setTimeout(finish, 12000);
});

const evaluate = async (cdp, sessionId, expression) => {
    const r = await cdp.send('Runtime.evaluate', {
        expression, returnByValue: true, awaitPromise: true, allowUnsafeEvalBlockedByCSP: true
    }, sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
};

const injectAndReload = async (cdp, sessionId, file) => {
    const source = await Bun.file(file).text();
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    const { identifier } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source }, sessionId);
    return identifier;
};

const reportLogs = logs => {
    if (!logs.length) return console.log('console: (无输出)');
    console.log('console:');
    logs.forEach(l => console.log('  ' + l));
    const errs = logs.filter(l => l.startsWith('[exception]') || l.startsWith('[error]'));
    if (errs.length) console.log(`⚠ ${errs.length} 条错误`);
};

// ==================== 命令实现 ====================
const commands = {
    async up() {
        const launched = await ensureBrowser();
        console.log(launched ? `已启动浏览器，调试端口 ${port}` : `调试端口 ${port} 已在运行`);
        const url = positional[0];
        if (url) {
            const cdp = await browserCdp();
            const { targetId } = await createTarget(cdp, url);
            console.log(`已打开 ${url}  (${targetId})`);
            cdp.close();
        }
        if (lastLaunch) console.log(`profile: ${lastLaunch.browser} / ${lastLaunch.label}${lastLaunch.dir ? ` [${lastLaunch.dir}]` : ''}`);
        else console.log('提示：浏览器已在运行，实际使用的 profile 未知。要切换账号需先完全退出浏览器。');
    },

    async accounts() {
        const b = await pickBrowser();
        const profiles = await readProfiles(b.root);
        if (!profiles.length) throw new Error(`读取不到 profile 列表：${b.root}/Local State`);
        console.log(`${b.name} profiles（* 为上次使用）:`);
        profiles.forEach(p => console.log(`  ${p.lastUsed ? '*' : ' '} ${p.dir.padEnd(12)} ${p.name}  ${p.user || '未登录'}`));
        console.log('\n指定账号：--account <邮箱>，或 --profile-dir "<目录名>"');
    },

    async resolve() {
        const b = await pickBrowser();
        const launch = await resolveLaunch(b);
        console.log(JSON.stringify({ browser: b.name, exe: b.exe, port, ...launch }, null, 1));
    },

    async tabs() {
        const cdp = await browserCdp();
        const { targetInfos } = await cdp.send('Target.getTargets');
        targetInfos.filter(t => t.type === 'page')
            .forEach(t => console.log(`${t.targetId}  ${t.url}`));
        cdp.close();
    },

    async run() {
        const url = positional[0];
        if (!url) throw new Error('用法: run <url> --inject <file>');
        const cdp = await browserCdp();
        const { targetId } = await createTarget(cdp, 'about:blank');
        const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

        if (flags.inject) await injectAndReload(cdp, sessionId, flags.inject);
        const { logs, off } = collectLogs(cdp, sessionId);
        await cdp.send('Page.enable', {}, sessionId);
        const loaded = waitLoad(cdp, sessionId, waitMs);
        await cdp.send('Page.navigate', { url }, sessionId);
        await loaded;
        off();

        console.log(`页面: ${url}`);
        reportLogs(logs);
        if (flags.eval) console.log('eval:', JSON.stringify(await evaluate(cdp, sessionId, flags.eval), null, 1));
        console.log(`标签页保持打开: ${targetId}`);
        cdp.close();
    },

    async inject() {
        const file = positional[0];
        if (!file) throw new Error('用法: inject <file> [--url <substr>]');
        const cdp = await browserCdp();
        const { sessionId, target } = await attachPage(cdp, flags.url);
        await injectAndReload(cdp, sessionId, file);
        const { logs, off } = collectLogs(cdp, sessionId);
        const loaded = waitLoad(cdp, sessionId, waitMs);
        await cdp.send('Page.reload', { ignoreCache: true }, sessionId);
        await loaded;
        off();

        console.log(`已注入 ${file} 并重载: ${target.url}`);
        reportLogs(logs);
        if (flags.eval) console.log('eval:', JSON.stringify(await evaluate(cdp, sessionId, flags.eval), null, 1));
        cdp.close();
    },

    async eval() {
        const expression = positional[0];
        if (!expression) throw new Error('用法: eval "<js>" [--url <substr>]');
        const cdp = await browserCdp();
        const { sessionId } = await attachPage(cdp, flags.url);
        console.log(JSON.stringify(await evaluate(cdp, sessionId, expression), null, 1));
        cdp.close();
    },

    async shot() {
        const out = positional[0] || 'shot.png';
        const cdp = await browserCdp();
        const { sessionId } = await attachPage(cdp, flags.url);
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
        await Bun.write(out, Buffer.from(data, 'base64'));
        console.log(`已保存 ${out}`);
        cdp.close();
    },

    // 兜底：直接下发任意 CDP 命令，用于现有命令没覆盖的域
    async send() {
        const [method, raw] = positional;
        if (!method) throw new Error('用法: send <Method> [json 参数] [--target id]');
        const cdp = await browserCdp();
        const { sessionId } = await attachPage(cdp, flags.url);
        const result = await cdp.send(method, raw ? JSON.parse(raw) : {}, sessionId);
        console.log(JSON.stringify(result, null, 1));
        cdp.close();
    },

    // 真实鼠标移动：触发 hover 态（悬浮控件、放大按钮等）
    async move() {
        const [x, y] = positional.map(Number);
        if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('用法: move <x> <y> [--target id]');
        const cdp = await browserCdp();
        const { sessionId } = await attachPage(cdp, flags.url);
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }, sessionId);
        console.log(`已移动到 (${x}, ${y})`);
        cdp.close();
    },

    // 真实鼠标点击：页面坐标，用于验证灯箱/悬浮控件等依赖 trusted 事件的交互
    async click() {
        const [x, y] = positional.map(Number);
        if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('用法: click <x> <y> [--target id]');
        const cdp = await browserCdp();
        const { sessionId, target } = await attachPage(cdp, flags.url);
        const base = { x, y, modifiers: 0, button: 'left', clickCount: 1 };
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }, sessionId);
        await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...base }, sessionId);
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...base }, sessionId);
        console.log(`已点击 (${x}, ${y}) → ${target.url}`);
        cdp.close();
    },

    // 真实按键：合成 KeyboardEvent 无法触发站点快捷键，必须走 CDP Input 域
    async key() {
        const spec = positional[0];
        if (!spec) throw new Error('用法: key <键> [--times n]，如 j / k / ArrowRight / Ctrl+Enter');
        const parts = String(spec).split('+');
        const name = parts.pop();
        const mods = {
            alt: parts.some(p => /alt/i.test(p)) ? 1 : 0,
            ctrl: parts.some(p => /ctrl|control/i.test(p)) ? 2 : 0,
            meta: parts.some(p => /meta|cmd/i.test(p)) ? 4 : 0,
            shift: parts.some(p => /shift/i.test(p)) ? 8 : 0
        };
        const modifiers = mods.alt | mods.ctrl | mods.meta | mods.shift;

        const KEYMAP = {
            Enter: 13, Escape: 27, Space: 32, Backspace: 8, Tab: 9,
            ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40,
            Home: 36, End: 35, PageUp: 33, PageDown: 34
        };
        let key = name, code, vk;
        if (KEYMAP[name]) { vk = KEYMAP[name]; code = name === 'Space' ? 'Space' : name; if (name === 'Space') key = ' '; }
        else if (/^[a-z]$/i.test(name)) { key = name; vk = name.toUpperCase().charCodeAt(0); code = `Key${name.toUpperCase()}`; }
        else if (/^\d$/.test(name)) { key = name; vk = name.charCodeAt(0); code = `Digit${name}`; }
        else throw new Error(`不支持的键: ${name}`);

        const cdp = await browserCdp();
        const { sessionId, target } = await attachPage(cdp, flags.url);
        // shift 会让字符键产出大写，快捷键场景保持原样即可
        const times = Number(flags.times || 1);
        for (let i = 0; i < times; i++) {
            // rawKeyDown + keyUp：站点快捷键只依赖 keydown，字符事件由 --text 显式补
            await cdp.send('Input.dispatchKeyEvent', {
                type: 'rawKeyDown', modifiers, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk
            }, sessionId);
            if (flags.text) {
                await cdp.send('Input.dispatchKeyEvent', {
                    type: 'char', modifiers, key, text: String(flags.text), unmodifiedText: String(flags.text)
                }, sessionId);
            }
            await cdp.send('Input.dispatchKeyEvent', {
                type: 'keyUp', modifiers, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk
            }, sessionId);
            if (times > 1) await sleep(Number(flags.interval ?? 150));
        }
        console.log(`已发送 ${spec}${times > 1 ? ` ×${times}` : ''} → ${target.url}`);
        cdp.close();
    },

    help() {
        console.log(`轻量 CDP 桥

  bun dev/cdp.js up [url]                        启动带调试端口的浏览器
  bun dev/cdp.js accounts                        列出浏览器 profile 与登录账号
  bun dev/cdp.js tabs                            列出标签页
  bun dev/cdp.js run <url> --inject <file>       新开标签并注入脚本源码
  bun dev/cdp.js inject <file> [--url <substr>]  向现有标签注入并重载
  bun dev/cdp.js eval "<js>" [--url <substr>]    页面求值
  bun dev/cdp.js shot <out.png> [--url <substr>] 截图
 bun dev/cdp.js key <键> [--times n]            发送真实按键（j / ArrowRight / Ctrl+Enter）

参数:
  --target <id>       按标签页 targetId 前缀精确定位（多标签同类页面时用）
  --account <邮箱>    选择目标浏览器账号（多 profile 时用），默认沿用上次使用的
  --profile-dir <名>  直接指定 profile 目录，如 "Profile 1"
  --profile <p>       debug（默认，独立 profile）| clone（复制真实 profile）| 自定义路径
  --refresh-clone     重新克隆 profile
  --port --browser --wait --eval

关于登录态：Chrome/Edge 136+ 禁止在默认 user-data-dir 上开调试端口，复制 profile 后
App-Bound Encryption 会让 Cookies 失效（实测 1337 条只剩 57 条），所以调试实例需要
手动登录一次，登录态保存在 %LOCALAPPDATA%\\cdp-profiles\\<browser>-debug，之后长期有效。`);
    }
};

const run = commands[cmd] || commands.help;
try {
    await run();
    process.exit(0);
} catch (e) {
    console.error('错误:', e.message);
    process.exit(1);
}
