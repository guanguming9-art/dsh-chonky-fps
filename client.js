window.__ModuleLoader__.load({
  id: 'dsh-chonky-fps',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const API = '/chonky-fps/api';
    const MODES = [
      { id: 'dsh-chonky-fps-60', hz: 60, zh: '普通潜水中', en: 'Normal dive', zhNote: '标准流畅档，最省电', enNote: 'baseline, the most efficient' },
      { id: 'dsh-chonky-fps-90', hz: 90, zh: '软乎乎档', en: 'Soft & squishy', zhNote: '画面更新更密，运动更顺', enNote: 'denser updates, smoother motion' },
      { id: 'dsh-chonky-fps-120', hz: 120, zh: '泡泡快跑档', en: 'Bubble dash', zhNote: '快速移动的轨迹更连续', enNote: 'more continuous fast movement' },
      { id: 'dsh-chonky-fps-144', hz: 144, zh: '满速甩尾档', en: 'Full-speed tail whip', zhNote: '120Hz 以上–144Hz，动态最清晰', enNote: 'above 120Hz up to 144Hz, sharpest motion' },
    ];
    const DEFAULT_HZ = 60;

    const TEXT = {
      zh: {
        title: '大肥鱼专属帧率模式',
        intro: '选一档就锁定在这一档及以上运行：画面按这一档的帧间隔刷新，不会再掉到更低档。',
        screen: '实测屏幕刷新率',
        hz: 'Hz',
        preview: '预览：轨迹按锁定档位的帧间隔推进',
        locked: '已锁定 ≥ {tier}Hz（实测 {hz}Hz）',
        unlocked: '未锁定：屏幕最高约 {hz}Hz，跑不到 {tier}Hz',
        measuring: '正在测量屏幕刷新率…',
        onlyDsh: '此帧率模式仅用于 DSH。',
        token: '帧率与 token 无关：调高或调低都不会增加或减少 token。',
        saving: '保存中…',
        failed: '读写失败：刷新页面后重试',
      },
      en: {
        title: 'Chonky frame-rate mode',
        intro: 'Pick a tier and the UI locks at that rate or above: frames advance at that tier’s interval and never drop to a lower one.',
        screen: 'Measured screen refresh rate',
        hz: 'Hz',
        preview: 'Preview: the trail advances at the locked tier’s frame interval',
        locked: 'Locked at ≥ {tier}Hz (measured {hz}Hz)',
        unlocked: 'Not locked: the screen tops out near {hz}Hz, so {tier}Hz is unreachable',
        measuring: 'Measuring the screen refresh rate…',
        onlyDsh: 'This frame-rate mode is for DSH only.',
        token: 'Frame rate is unrelated to tokens: raising or lowering it adds or saves nothing.',
        saving: 'Saving…',
        failed: 'Read/write failed: refresh the page and retry',
      },
    };

    const isZh = () => {
      const lang = (typeof navigator !== 'undefined' && navigator.language) || 'zh';
      return String(lang).toLowerCase().indexOf('zh') === 0;
    };
    const copy = () => (isZh() ? TEXT.zh : TEXT.en);
    const nameOf = (mode) => (isZh() ? mode.zh : mode.en);
    const noteOf = (mode) => (isZh() ? mode.zhNote : mode.enNote);
    const hzOf = (id) => {
      const found = MODES.filter((mode) => mode.id === id)[0];
      return found === undefined ? DEFAULT_HZ : found.hz;
    };

    async function readState() {
      const response = await fetch(API + '/state', { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    }

    async function writeState(mode) {
      const response = await fetch(API + '/set', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    }

    /** Mean frame interval over one-second windows, rounded to a whole Hz. */
    function useScreenHz() {
      const [hz, setHz] = React.useState(null);
      React.useEffect(() => {
        let raf = 0;
        let first = null;
        let frames = 0;
        const step = (time) => {
          if (first === null) first = time;
          frames += 1;
          if (time - first >= 1000) {
            setHz(Math.round((frames * 1000) / (time - first)));
            first = null;
            frames = 0;
          }
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        const restart = () => {
          if (document.visibilityState !== 'visible') return;
          first = null;
          frames = 0;
        };
        document.addEventListener('visibilitychange', restart);
        return () => {
          cancelAnimationFrame(raf);
          document.removeEventListener('visibilitychange', restart);
        };
      }, []);
      return hz;
    }

    /** The moving marker: its position only advances on the locked tier's frame interval. */
    function Trail(props) {
      const dotRef = React.useRef(null);
      const hz = props.hz;
      React.useEffect(() => {
        const interval = 1000 / hz;
        let raf = 0;
        let start = null;
        const tick = (time) => {
          if (start === null) start = time;
          const quantized = Math.floor((time - start) / interval) * interval;
          const phase = (quantized % 2400) / 2400;
          const dot = dotRef.current;
          if (dot !== null) {
            dot.style.left = 'calc(' + (phase * 100).toFixed(3) + '% - ' + (phase * 10).toFixed(2) + 'px)';
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
      }, [hz]);
      const track = {
        position: 'relative',
        height: '10px',
        marginTop: '8px',
        borderRadius: '999px',
        background: 'var(--dsw-alias-bg-layer-2)',
        border: '1px solid var(--dsw-alias-border-l1)',
        overflow: 'hidden',
      };
      const dot = {
        position: 'absolute',
        top: '-1px',
        left: '0',
        width: '10px',
        height: '10px',
        borderRadius: '999px',
        background: 'var(--dsw-alias-brand-primary)',
      };
      return h('div', { style: track }, h('div', { ref: dotRef, style: dot }));
    }

    function Section() {
      const [mode, setMode] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [failed, setFailed] = React.useState(false);
      const screenHz = useScreenHz();
      const t = copy();

      React.useEffect(() => {
        let alive = true;
        readState().then((payload) => {
          if (alive) {
            setMode(payload.mode);
            setFailed(false);
          }
        }, () => {
          if (alive) setFailed(true);
        });
        return () => {
          alive = false;
        };
      }, []);

      // Re-assert the lock after any mount or tab switch: the chosen tier is published on the
      // document so the whole client can read one value.
      React.useEffect(() => {
        const apply = () => {
          if (mode === null) return;
          document.documentElement.setAttribute('data-frame-mode', mode);
          document.documentElement.style.setProperty('--dsh-frame-hz', String(hzOf(mode)));
        };
        apply();
        document.addEventListener('visibilitychange', apply);
        return () => {
          document.removeEventListener('visibilitychange', apply);
          document.documentElement.removeAttribute('data-frame-mode');
          document.documentElement.style.removeProperty('--dsh-frame-hz');
        };
      }, [mode]);

      const choose = async (next) => {
        if (busy) return;
        setBusy(true);
        try {
          const payload = await writeState(next);
          setMode(payload.mode);
          setFailed(false);
        } catch (error) {
          console.warn('[chonky-fps] save failed', error);
          setFailed(true);
        } finally {
          setBusy(false);
        }
      };

      const targetHz = hzOf(mode);
      const locked = screenHz !== null && screenHz + 2 >= targetHz;

      const row = (entry) => {
        const active = entry.id === mode;
        const dot = h('span', {
          'aria-hidden': 'true',
          style: {
            flex: '0 0 auto',
            width: '14px',
            height: '14px',
            borderRadius: '999px',
            boxSizing: 'border-box',
            border: '2px solid ' + (active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)'),
            background: active ? 'var(--dsw-alias-brand-primary)' : 'transparent',
          },
        });
        const label = h('span', { style: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' } },
          h('span', { style: { fontSize: '13px', lineHeight: '1.35' } }, nameOf(entry) + '（' + entry.hz + t.hz + '）'),
          h('span', { style: { fontSize: '12px', lineHeight: '1.35', color: 'var(--dsw-alias-label-secondary)' } }, noteOf(entry)));
        return h('button', {
          key: entry.id,
          type: 'button',
          'aria-pressed': active,
          disabled: busy,
          onClick: () => choose(entry.id),
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 12px',
            textAlign: 'left',
            font: 'inherit',
            color: 'var(--dsw-alias-label-primary)',
            background: active ? 'var(--dsw-alias-bg-layer-2)' : 'var(--dsw-alias-bg-layer-1)',
            border: '1px solid ' + (active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l1)'),
            borderRadius: '10px',
            cursor: busy ? 'progress' : 'pointer',
            transition: 'background 120ms ease, border-color 120ms ease',
          },
        }, dot, label);
      };

      const muted = { fontSize: '12px', lineHeight: '1.6', color: 'var(--dsw-alias-label-secondary)' };
      const children = [];

      children.push(h('div', { key: 'head', style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
        h('h2', { style: { margin: '0', fontSize: '15px', fontWeight: '600', color: 'var(--dsw-alias-label-primary)' } }, t.title),
        h('p', { style: Object.assign({ margin: '0' }, muted) }, t.intro)));

      const rows = MODES.map(row);
      children.push(h('div', { key: 'rows', style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, rows));

      const statusText = screenHz === null
        ? t.measuring
        : locked
          ? t.locked.replace('{tier}', String(targetHz)).replace('{hz}', String(screenHz))
          : t.unlocked.replace('{tier}', String(targetHz)).replace('{hz}', String(screenHz));
      const statusColor = screenHz === null
        ? 'var(--dsw-alias-label-secondary)'
        : locked ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-warn-primary)';
      children.push(h('div', { key: 'lock', style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
        h('div', { style: { fontSize: '12.5px', fontWeight: '600', color: statusColor } }, statusText),
        h('div', { style: muted }, t.screen + ' ' + (screenHz === null ? '…' : screenHz + ' ' + t.hz))));

      children.push(h('div', { key: 'preview', style: { display: 'flex', flexDirection: 'column' } },
        h('div', { style: muted }, t.preview),
        h(Trail, { hz: targetHz })));

      children.push(h('p', { key: 'only', style: Object.assign({ margin: '0' }, muted) }, t.onlyDsh + t.token));

      if (failed) {
        children.push(h('div', {
          key: 'failed',
          style: { fontSize: '12px', color: 'var(--dsw-alias-state-error-primary)' },
        }, t.failed));
      }
      if (busy) {
        children.push(h('div', { key: 'busy', style: muted }, t.saving));
      }

      return h('div', {
        style: { display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '560px', padding: '4px 0 8px' },
      }, children);
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'chonky-fps',
          order: 30,
          label: () => (isZh() ? '大肥鱼专属帧率模式' : 'Chonky FPS'),
          locale: 'chonky-fps',
        }, Section));
      },
    };
  },
});
