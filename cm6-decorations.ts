/**
 * cm6-decorations.ts
 * Drop-in CM6 decoration extension for Rhyme Lab Pro.
 * Requires bundling (esbuild/rollup) with @codemirror/view and @codemirror/state deps.
 */
import { EditorView, Decoration, DecorationSet } from "@codemirror/view";
import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";

export type RhymeRange = { from: number; to: number; className: string };

const setRhymeRanges = StateEffect.define<RhymeRange[]>();
const rhymeField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(deco, tr) {
    for (const e of tr.effects) if (e.is(setRhymeRanges)) {
      const builder = new RangeSetBuilder<Decoration>();
      for (const r of e.value) builder.add(r.from, r.to, Decoration.mark({ class: r.className }));
      return builder.finish();
    }
    return deco.map(tr.changes);
  },
  provide: f => EditorView.decorations.from(f)
});

export function setHighlights(view: EditorView, ranges: RhymeRange[]) {
  view.dispatch({ effects: setRhymeRanges.of(ranges) });
}

export function createRhymeExtension() {
  return [rhymeField];
}
