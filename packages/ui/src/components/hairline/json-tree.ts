export type JsonKind = "object" | "array" | "string" | "number" | "boolean" | "null";
export type JsonChange = "same" | "added" | "removed" | "changed";
export type JsonKey = string | number;

export interface JsonNode {
  /** The path as a string, stable across renders. */
  id: string;
  key: JsonKey | null;
  path: JsonKey[];
  depth: number;
  kind: JsonKind;
  /** Primitives only. */
  value?: string | number | boolean | null;
  children?: JsonNode[];
  /** Keys or items in a container. */
  size?: number;
  /** Diff only. */
  change?: JsonChange;
  /** The old value of a changed primitive (or a summary of an old container). */
  before?: string | number | boolean | null;
  beforeKind?: JsonKind;
  /** Changes at or below this node. */
  counts?: { added: number; removed: number; changed: number };
}

const kindOf = (v: unknown): JsonKind =>
  v === null || v === undefined ? "null" : Array.isArray(v) ? "array" : typeof v === "object" ? "object" : typeof v === "number" || typeof v === "bigint" ? "number" : typeof v === "boolean" ? "boolean" : "string";

const prim = (v: unknown): string | number | boolean | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") return v;
  if (typeof v === "bigint") return Number(v);
  return String(v);
};

export const idOf = (path: JsonKey[]) => (path.length ? path.map((k) => (typeof k === "number" ? `[${k}]` : `.${k.replace(/[.[\]\\]/g, "\\$&")}`)).join("") : "$");

const entries = (v: unknown): [JsonKey, unknown][] => (Array.isArray(v) ? v.map((x, i) => [i, x] as [JsonKey, unknown]) : Object.entries(v as Record<string, unknown>));

/** Any value as a tree. Circular references become the string "[circular]". */
export function buildTree(value: unknown, path: JsonKey[] = [], seen = new WeakSet<object>()): JsonNode {
  const kind = kindOf(value);
  const node: JsonNode = { id: idOf(path), key: path.length ? path[path.length - 1] : null, path, depth: path.length, kind };
  if (kind === "object" || kind === "array") {
    if (seen.has(value as object)) return { ...node, kind: "string", value: "[circular]" };
    seen.add(value as object);
    node.children = entries(value).map(([k, v]) => buildTree(v, [...path, k], seen));
    node.size = node.children.length;
    seen.delete(value as object);
  } else node.value = prim(value);
  return node;
}

const mark = (node: JsonNode, change: JsonChange): JsonNode => {
  const children = node.children?.map((c) => mark(c, change));
  const one = { added: change === "added" ? 1 : 0, removed: change === "removed" ? 1 : 0, changed: 0 };
  return { ...node, children, change, counts: one };
};

const same = (a: unknown, b: unknown) => a === b || (Number.isNaN(a) && Number.isNaN(b));

/** One tree that shows how `before` became `after`. */
export function diffTree(before: unknown, after: unknown, { arrayKey, path = [] }: { arrayKey?: string; path?: JsonKey[] } = {}): JsonNode {
  const ka = kindOf(before);
  const kb = kindOf(after);
  const base: JsonNode = { id: idOf(path), key: path.length ? path[path.length - 1] : null, path, depth: path.length, kind: kb };
  const containers = (k: JsonKind) => k === "object" || k === "array";
  if (ka !== kb || !containers(kb)) {
    if (!containers(ka) && !containers(kb) && same(before, after)) return { ...base, value: prim(after), change: "same", counts: { added: 0, removed: 0, changed: 0 } };
    // A changed primitive (or a container that became something else): old value shown before the new.
    const fresh = buildTree(after, path);
    return {
      ...fresh,
      change: "changed",
      before: containers(ka) ? (ka === "array" ? `[${(before as unknown[]).length} items]` : `{${Object.keys(before as object).length} keys}`) : prim(before),
      beforeKind: ka,
      counts: { added: 0, removed: 0, changed: 1 },
    };
  }
  const children: JsonNode[] = [];
  if (kb === "array" && arrayKey && [...(before as unknown[]), ...(after as unknown[])].every((x) => x && typeof x === "object" && arrayKey in (x as object))) {
    // Records matched by their key, so an item inserted at the top doesn't make every row "changed".
    const keyOf = (x: unknown) => String((x as Record<string, unknown>)[arrayKey]);
    const old = new Map((before as unknown[]).map((x) => [keyOf(x), x]));
    const kept = new Set<string>();
    (after as unknown[]).forEach((x, i) => {
      const k = keyOf(x);
      kept.add(k);
      children.push(old.has(k) ? diffTree(old.get(k), x, { arrayKey, path: [...path, i] }) : mark(buildTree(x, [...path, i]), "added"));
    });
    (before as unknown[]).forEach((x, i) => {
      if (!kept.has(keyOf(x))) children.push(mark(buildTree(x, [...path, `${i} (removed)`]), "removed"));
    });
  } else {
    const a = new Map(entries(before));
    const b = entries(after);
    for (const [k, v] of b) children.push(a.has(k) ? diffTree(a.get(k), v, { arrayKey, path: [...path, k] }) : mark(buildTree(v, [...path, k]), "added"));
    const inAfter = new Set(b.map(([k]) => k));
    for (const [k, v] of a) if (!inAfter.has(k)) children.push(mark(buildTree(v, [...path, k]), "removed"));
  }
  const counts = { added: 0, removed: 0, changed: 0 };
  for (const c of children) {
    // A whole added or removed subtree counts once.
    if (c.change === "added") counts.added++;
    else if (c.change === "removed") counts.removed++;
    else if (c.counts) {
      counts.added += c.counts.added;
      counts.removed += c.counts.removed;
      counts.changed += c.counts.changed;
    }
  }
  const changed = counts.added + counts.removed + counts.changed > 0;
  return { ...base, children, size: children.length, change: changed ? "changed" : "same", counts };
}

/** Every node, depth first, with a map from each id to its parent's. */
export function flatten(root: JsonNode) {
  const all: JsonNode[] = [];
  const parent = new Map<string, string>();
  const walk = (n: JsonNode) => {
    all.push(n);
    n.children?.forEach((c) => {
      parent.set(c.id, n.id);
      walk(c);
    });
  };
  walk(root);
  return { all, parent };
}

const IDENT = /^[A-Za-z_$][\w$]*$/;
/** The path to copy: data.items[2].id, or .data.items[2].id for jq. */
export function formatPath(path: JsonKey[], style: "js" | "jq" = "js") {
  let out = "";
  for (const k of path) {
    if (typeof k === "number") out += `[${k}]`;
    else if (/^\d+ \(removed\)$/.test(k)) out += `[${parseInt(k)}]`;
    else if (IDENT.test(k)) out += style === "jq" || out ? `.${k}` : k;
    else out += style === "jq" ? `.${JSON.stringify(k)}` : `[${JSON.stringify(k)}]`;
  }
  return style === "jq" ? out || "." : out || "(root)";
}

/** Ids of nodes whose key or value contains the query, in document order. */
export function searchTree(all: JsonNode[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return all
    .filter((n) => (n.key !== null && typeof n.key === "string" && n.key.toLowerCase().includes(q)) || (n.children === undefined && String(n.value).toLowerCase().includes(q)))
    .map((n) => n.id);
}

/** The offset where text stops being JSON, or -1. Browsers word (and place) their errors differently, so we find it ourselves. */
export function locateError(text: string): number {
  let i = 0;
  const fail = (): never => {
    throw i;
  };
  const ws = () => {
    while (i < text.length && (text[i] === " " || text[i] === "\n" || text[i] === "\r" || text[i] === "\t")) i++;
  };
  const string = () => {
    i++;
    while (i < text.length) {
      const c = text[i];
      if (c === '"') return void i++;
      if (c === "\\") i += 2;
      else if (c < " ") fail();
      else i++;
    }
    fail();
  };
  const value = (): void => {
    ws();
    const c = text[i];
    if (c === "{") {
      i++;
      ws();
      if (text[i] === "}") return void i++;
      for (;;) {
        ws();
        if (text[i] !== '"') fail();
        string();
        ws();
        if (text[i] !== ":") fail();
        i++;
        value();
        ws();
        if (text[i] === ",") i++;
        else if (text[i] === "}") return void i++;
        else fail();
      }
    }
    if (c === "[") {
      i++;
      ws();
      if (text[i] === "]") return void i++;
      for (;;) {
        value();
        ws();
        if (text[i] === ",") i++;
        else if (text[i] === "]") return void i++;
        else fail();
      }
    }
    if (c === '"') return string();
    const num = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
    num.lastIndex = i;
    if (num.test(text)) return void (i = num.lastIndex);
    for (const w of ["true", "false", "null"]) if (text.startsWith(w, i)) return void (i += w.length);
    fail();
  };
  try {
    value();
    ws();
    if (i < text.length) fail();
    return -1;
  } catch (at) {
    return typeof at === "number" ? at : -1;
  }
}

/** Why and where JSON.parse gave up, as a 1-based line and column. */
export function parseError(text: string, error: unknown): { message: string; line: number; column: number } {
  const raw = error instanceof Error ? error.message : String(error);
  let pos = locateError(text);
  if (pos < 0) {
    const lc = raw.match(/line (\d+) column (\d+)/);
    if (lc) return { message: tidyMessage(raw), line: Number(lc[1]), column: Number(lc[2]) };
    const at = raw.match(/position (\d+)/);
    pos = at ? Number(at[1]) : 0;
  }
  const before = text.slice(0, pos).split("\n");
  return { message: tidyMessage(raw), line: before.length, column: before[before.length - 1].length + 1 };
}

const tidyMessage = (raw: string) =>
  raw
    .replace(/^JSON\.parse: /, "")
    .replace(/^JSON Parse error: /, "")
    .replace(/ in JSON at position \d+[\s\S]*$/, "")
    .replace(/, "[\s\S]*" is not valid JSON$/, "")
    .replace(/ at line \d+ column \d+ of the JSON data$/, "")
    .replace(/^SyntaxError: /, "");
