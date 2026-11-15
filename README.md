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

**It cannot raise your real frame rate.** The plugin cannot change your hardware or browser ceiling. On a 60Hz screen, picking the 144Hz tier does not make the screen run at 144 frames per second: the page reports it honestly as *"Not locked: the screen tops out near 60Hz, so 144Hz is unreachable"* instead of pretending it worked. That message is the correct behaviour, not a fault — expecting 144 real frames on a 60Hz panel is the misconception.

It does not raise frame rates in games or video either — it only affects DSH's own UI.

Frame rate is unrelated to tokens: raising or lowering it neither adds nor saves tokens, and the plugin never calls a model.

## Install

```sh
dsh plugin --profile web add dsh-chonky-fps
```

Or install it from the plugin market.

> **Restart the engine after installing.** `dsh plugin add` writes the plugin row to your profile but does not reload it. Until you restart, the engine can fail on startup with `patch: entry "<id>" not found`, and the dsh-go panel reports *"plugin disabled or not found"*. Restart the engine (App → Engine → Restart, or restart `dsh web`), then refresh the Web page; on the phone enable it under **Settings → Plugins**.

If the tiers still do not appear after a restart, restart once more: the first start after an install is the one that picks the new plugin up.

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
