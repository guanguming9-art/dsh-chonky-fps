# dsh-chonky-fps

Chonky frame-rate mode for DeepSeek Harness.

Four tiers, locked on selection: Normal dive 60Hz, Soft & squishy 90Hz, Bubble dash 120Hz, Full-speed tail whip 144Hz.

> This frame-rate mode is for DSH only.

## What it does

- Adds a **Chonky frame-rate mode** page to DSH Web **Settings** with the four tiers.
- Provides a native panel in the dsh-go phone app (plugins page, all features, session detail, composer "+"); the phone and the Web page share one stored value.
- Locks the chosen tier: the preview trail advances at that tier's frame interval and re-asserts on tab switch; the tier is also published as `data-frame-mode` and the `--dsh-frame-hz` CSS variable so the page can drive one refresh rhythm.
- Measures the screen refresh rate and reports lock state: "Locked at ≥120Hz (measured 121Hz)" when reachable, "Not locked: the screen tops out near 60Hz" when not.

## What it does not do

The plugin cannot change your hardware or browser ceiling. A 60Hz screen cannot show 120 frames per second, and the page says so instead of pretending. It does not raise frame rates in games or video — it only affects DSH's own UI.

Frame rate is unrelated to tokens: raising or lowering it neither adds nor saves tokens, and the plugin never calls a model.

## Install

```sh
dsh plugin --profile web add dsh-chonky-fps
```

Or install it from the plugin market. Refresh the Web page afterwards; on the phone enable it under Settings → Plugins and restart the engine if the tiers do not appear.

## Tiers

| Tier | Rate | id |
|---|---|---|
| Normal dive | 60Hz | `dsh-chonky-fps-60` |
| Soft & squishy | 90Hz | `dsh-chonky-fps-90` |
| Bubble dash | 120Hz | `dsh-chonky-fps-120` |
| Full-speed tail whip | 144Hz | `dsh-chonky-fps-144` |

State file: `~/.dsh/chonky-fps.json`. Delete it to fall back to the 60Hz default.

## License

MIT
