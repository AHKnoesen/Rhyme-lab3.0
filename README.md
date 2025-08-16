# Rhyme Lab Pro — fixed build

This bundle contains:
- `main.js` — engine + results view (panel), CM6-safe.
- `main-simple.js` — simplified panel-only version.
- `rhyme-lab-main.js` — legacy inline highlighting now **guarded** (won't crash on CM6).
- `styles.css` — theme-friendly, no invalid HSL math.
- `manifest.json` — targets Obsidian ≥ 0.15.
- `cm6-decorations.ts` — proper CM6 decoration extension (requires bundling).
  
## Install (panel-only, no bundling)
1. Copy the folder to: `<vault>/.obsidian/plugins/rhyme-lab-pro/`
2. Enable **Rhyme Lab Pro** in Settings → Community plugins.
3. Command palette → **Rhyme Lab: Analyze Current Note**.

## Add inline highlights (CM6, recommended)
You'll need a tiny build step:
```bash
# in the plugin folder
npm init -y
npm i -D esbuild @codemirror/view @codemirror/state
# build
npx esbuild cm6-decorations.ts --bundle --format=iife --global-name=RhymeLabCM6 --outfile=cm6-decorations.js
```
Then in `main.js`, load and register the extension (already scaffolded with `maybeEnableCM6()`).
