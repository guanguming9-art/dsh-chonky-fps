/**
 * Host half of the 大肥鱼专属帧率模式: owns the persisted tier (the App edits the
 * same value through its native settings page), serves a small JSON API to the
 * Web settings page, and exposes the four tiers as a dsh-go panel.
 */
import fs from 'node:fs';
import path from 'node:path';
import z from '@deepseek-ai/schemastery';

const HOME = process.env.DSH_HOME || '/root/.dsh';
const STATE_FILE = path.join(HOME, 'chonky-fps.json');

const MODES = [
  { id: 'dsh-chonky-fps-60', hz: 60, zh: '普通潜水中', en: 'Normal dive', zhNote: '标准流畅档，最省电', enNote: 'baseline, the most efficient' },
  { id: 'dsh-chonky-fps-90', hz: 90, zh: '软乎乎档', en: 'Soft & squishy', zhNote: '画面更新更密，运动更顺', enNote: 'denser updates, smoother motion' },
  { id: 'dsh-chonky-fps-120', hz: 120, zh: '泡泡快跑档', en: 'Bubble dash', zhNote: '快速移动的轨迹更连续', enNote: 'more continuous fast movement' },
  { id: 'dsh-chonky-fps-144', hz: 144, zh: '满速甩尾档', en: 'Full-speed tail whip', zhNote: '120Hz 以上–144Hz，动态最清晰', enNote: 'above 120Hz up to 144Hz, sharpest motion' },
];

const DEFAULT_MODE = MODES[0].id;

export const name = 'dsh-chonky-fps';

export const Config = z.object({
  mode: z
    .union(MODES.map((mode) => mode.id))
    .default(DEFAULT_MODE)
    .description('大肥鱼专属帧率模式：选中的档位锁定在该帧率及以上运行（仅用于 DSH）'),
});

function findMode(id) {
  return MODES.find((mode) => mode.id === id) ?? null;
}

function readMode() {
  try {
    const mode = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')).mode;
    if (findMode(mode) !== null) return mode;
  } catch {
    /* missing or unreadable state falls back to the default tier */
  }
  return DEFAULT_MODE;
}

function writeMode(mode) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    const tmp = `${STATE_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ mode, at: new Date().toISOString() }, null, 1));
    fs.renameSync(tmp, STATE_FILE);
  } catch (error) {
    console.warn('[chonky-fps] cannot persist state', error);
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(payload));
}

export const inject = ['webServer'];

export function apply(ctx, config) {
  // The App edits `mode` through the native settings page; keep the shared file in step.
  const configured = typeof config?.mode === 'string' && findMode(config.mode) !== null ? config.mode : null;
  if (configured !== null) writeMode(configured);

  if (ctx.webServer !== undefined) ctx.effect(() => {
    const webServer = ctx.webServer;
    const handler = async (req, res) => {
      try {
        const pathname = String(req.url ?? '').split('?')[0].replace(/\/+$/u, '');
        if (req.method === 'GET' && pathname.endsWith('/api/state')) {
          sendJson(res, 200, { ok: true, mode: readMode(), modes: MODES });
          return;
        }
        if (req.method === 'POST' && pathname.endsWith('/api/set')) {
          let body = {};
          try {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const raw = Buffer.concat(chunks).toString('utf8');
            if (raw !== '') body = JSON.parse(raw);
          } catch {
            body = {};
          }
          const mode = findMode(body.mode);
          if (mode === null) {
            sendJson(res, 400, { ok: false, error: 'unknown frame-rate mode' });
            return;
          }
          writeMode(mode.id);
          sendJson(res, 200, { ok: true, mode: mode.id });
          return;
        }
        sendJson(res, 404, { ok: false, error: 'unknown chonky-fps endpoint' });
      } catch (error) {
        sendJson(res, 500, { ok: false, error: String(error?.message ?? error) });
      }
    };
    return webServer.register({ kind: 'prefix', path: '/chonky-fps', handler });
  }, 'chonky-fps: api routes');

  ctx.inject(['dshGo'], (scoped) => {
    const describe = (mode) => ({
      currentLabel: `${mode.zh}（${mode.hz}Hz）`,
      caption: `锁定 ≥ ${mode.hz}Hz · ${mode.zhNote}`,
      code: mode.id,
    });

    scoped.dshGo.panel('rates', {
      view: () => ({
        type: 'stack',
        title: '大肥鱼专属帧率',
        children: [
          { type: 'metric', label: '当前档位', value: { $: 'data.currentLabel' }, caption: { $: 'data.caption' } },
          { type: 'keyValue', items: [['档位编号', { $: 'data.code' }]] },
          { type: 'text', text: '选中哪一档，就锁定在那一档及以上运行；能不能跑满取决于屏幕刷新率。' },
          {
            type: 'actions',
            items: MODES.map((mode) => ({ label: `${mode.zh} ${mode.hz}Hz`, action: `m-${mode.hz}`, style: 'plain' })),
          },
          { type: 'callout', text: '此帧率模式仅用于 DSH；帧率与 token 无关，调高调低都不会增加或减少 token。', tone: 'info' },
        ],
      }),
      data: (scope, emit) => {
        emit(describe(findMode(readMode())));
        return () => {};
      },
      actions: Object.fromEntries(
        MODES.map((mode) => [
          `m-${mode.hz}`,
          () => {
            writeMode(mode.id);
            return { patch: describe(mode), toast: `已锁定${mode.zh} ${mode.hz}Hz` };
          },
        ]),
      ),
    });
  });
}
