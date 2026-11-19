import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { defaultTheme, themeBootScript, themeStorageKey } from "../lib/theme.ts";

const css = readFileSync(new URL("../app/themes.css", import.meta.url), "utf8");
const tokens = (block) => Object.fromEntries([...block.matchAll(/--([\w-]+): (#\w{6});/g)].map(([, name, value]) => [name, value]));
const status = tokens(css);

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((channel) => {
    const srgb = parseInt(channel, 16) / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

for (const palette of ["nature", "graphite"]) {
  test(`${palette}: text and essential control contrast meet WCAG AA thresholds`, (t) => {
    const entry = palette === "nature"
      ? css.match(/:root \{([^}]+)}/)
      : css.match(/:root\[data-theme="graphite"\] \{([^}]+)}/);
    assert.ok(entry);
    const color = tokens(entry[1]);
    const { bg, surface, text, primary, "primary-wash": wash } = color;
    assert.deepEqual([bg, surface, text, primary, wash], palette === "nature"
      ? ["#f5f8f6", "#ffffff", "#17372c", "#16745a", "#e7f2eb"]
      : ["#faf9f6", "#ffffff", "#30363a", "#52656a", "#f0ede7"]);
    const pairs = [
      ["heading / page", "text", "bg", 3],
      ["index value / card", "text", "inset", 4.5],
      ["text / page", "body", "bg", 4.5],
      ["text / card", "body", "surface", 4.5],
      ["text / AI response", "body", "inset", 4.5],
      ["muted / page", "muted", "bg", 4.5],
      ["muted / card", "muted", "surface", 4.5],
      ["placeholder / white", "muted", "surface", 4.5],
      ["muted / inset", "muted", "inset", 4.5],
      ["CTA", "surface", "primary", 4.5],
      ["CTA hover", "surface", "primary-hover", 4.5],
      ["selected label", "primary-hover", "primary-wash", 4.5],
      ["field edge / white", "control-border", "surface", 3],
      ["field edge / inset", "control-border", "inset", 3],
      ["control edge / page", "control-border", "bg", 3],
      ["active edge / wash", "primary", "primary-wash", 3],
      ["focus / page", "primary", "bg", 3],
      ["focus / inset", "primary", "inset", 3],
      ["error text", "theme-danger", "theme-danger-bg", 4.5],
      ["error edge / white", "theme-danger-edge", "surface", 3],
      ["demo notice", "theme-note", "theme-note-bg", 4.5],
      ["demo note edge / white", "theme-note-edge", "surface", 3],
    ];
    for (const [label, a, b, minimum] of pairs) {
      const ratio = contrast(color[a] ?? status[a], color[b] ?? status[b]);
      assert.ok(ratio >= minimum, `${label}: ${ratio.toFixed(2)} < ${minimum}`);
      t.diagnostic(`${label}: ${ratio.toFixed(2)}:1`);
    }
  });
}

test("the pre-paint script applies only a saved Warm Graphite preference", () => {
  for (const value of [null, "nature", "graphite", "neutral", "<invalid>"]) {
    const dataset = { theme: defaultTheme };
    let requestedKey;
    runInNewContext(themeBootScript, {
      document: { documentElement: { dataset } },
      localStorage: { getItem: (key) => { requestedKey = key; return value; } },
    });
    assert.equal(requestedKey, themeStorageKey);
    assert.equal(dataset.theme, value === "graphite" ? "graphite" : "nature");
  }
});

test("blocked storage leaves the server-rendered Clean Nature default intact", () => {
  const dataset = { theme: defaultTheme };
  runInNewContext(themeBootScript, {
    document: { documentElement: { dataset } },
    get localStorage() { throw new Error("Storage unavailable"); },
  });
  assert.equal(dataset.theme, "nature");
});
