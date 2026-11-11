"use client";

import * as React from "react";
import { ChevronRight, File, Folder, FolderOpen, Plus, Trash2 } from "lucide-react";
import { useRowMotion } from "./use-row-motion";
import { useTreeDrag } from "./use-tree-drag";

/* ─────────────────────────────────────────────────────────
 * TREE VIEW: the sidebar of pages, folders or files
 *
 *   open      a row's children slide out from under it while
 *             the rows below make room; closing folds them away
 *   carry     drag a row (and everything inside it): up and
 *             down picks the gap, sideways picks the depth, and
 *             a line starting at that depth shows where it lands
 *   into      the middle of a row means "inside it"; a closed
 *             one opens itself if you hold it there
 *   refuse    a rule (canDrop) turns the line amber and says
 *             why under the row you carry; let go and it flies
 *             home
 *   land      the row glides from where you let go into its
 *             place; a save that fails takes it back
 *   edit      F2 or double-click renames in place, + adds a row
 *             inside, Delete removes with Undo
 *   keys      arrows move and open, Alt+arrows move the row
 *             (up, down, in, out)
 *
 * Nodes are a flat list of { id, parent, title }, siblings in
 * the order they stand: the shape a database keeps.
 * ───────────────────────────────────────────────────────── */

export interface TreeNode {
  id: string;
  parent: string | null;
  title: string;
  /** Can't hold other rows (a file, say). */
  leaf?: boolean;
}

export interface TreeViewProps<T extends TreeNode> extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "defaultValue" | "onSelect"> {
  nodes?: T[];
  defaultNodes?: T[];
  onNodesChange?: (nodes: T[]) => void;
  /** Ids of the open rows. */
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (ids: string[]) => void;
  selected?: string | null;
  defaultSelected?: string | null;
  /** A row chosen by click, Enter or Space. */
  onSelect?: (node: T) => void;
  /** The row's icon. Defaults to a folder (open or closed) or a file. */
  icon?: (node: T, state: { expanded: boolean; hasChildren: boolean }) => React.ReactNode;
  /** Why `parent` won't take `node` (null is the top level), or nothing. */
  canDrop?: (node: T, parent: T | null) => string | null | undefined | void;
  /** A row moved. Throw to put it back. */
  onMove?: (node: T, parent: T | null, index: number) => Promise<void> | void;
  /** Shows rename (F2, double-click). Throw to put the old title back. */
  onRename?: (node: T, title: string) => Promise<void> | void;
  /** Shows + on rows that hold others (and at the foot). Return the new node. */
  onCreate?: (parent: T | null, title: string) => T | Promise<T>;
  /** Shows delete. Runs once the chance to undo is over; throw to bring the row back. */
  onDelete?: (node: T) => Promise<void> | void;
  /** The noun for new rows: "page", "file". */
  addLabel?: string;
  undoFor?: number;
  /** Pixels per level. */
  indent?: number;
  label?: string;
}

type Row<T> =
  | { kind: "node"; node: T; depth: number; hasChildren: boolean; open: boolean; pos: number; size: number }
  | { kind: "empty"; parent: string; depth: number }
  | { kind: "draft"; parent: string | null; depth: number };

type Note = { text: string; tone: "warn" | "error"; key: number };
type Undo<T> = { key: number; node: T; removed: T[]; nodes: T[] };

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const GLIDE = 480;
const ROW_H = 30;
const INSET = 26;
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const NO_IDS: string[] = [];
const NO_RANKS: ReadonlyMap<string, number> = new Map();

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

/** Every node under `id`, at any depth. */
function under<T extends TreeNode>(nodes: T[], id: string) {
  const out = new Set<string>();
  const walk = (p: string) => nodes.forEach((n) => n.parent === p && !out.has(n.id) && (out.add(n.id), walk(n.id)));
  walk(id);
  return out;
}

/** Moves a node into `parent`: first (after null), after a sibling, or at the end. */
function place<T extends TreeNode>(nodes: T[], id: string, parent: string | null, after: string | null | "end"): T[] {
  const node = nodes.find((n) => n.id === id);
  if (!node) return nodes;
  const rest = nodes.filter((n) => n.id !== id);
  const sibs = rest.filter((n) => n.parent === parent);
  let at: number;
  if (after === "end") at = sibs.length ? rest.indexOf(sibs[sibs.length - 1]) + 1 : rest.length;
  else if (after === null) at = sibs.length ? rest.indexOf(sibs[0]) : rest.length;
  else at = rest.findIndex((n) => n.id === after) + 1;
  return [...rest.slice(0, at), { ...node, parent } as T, ...rest.slice(at)];
}

/** A sentence that changes crossfades whole. */
function Line({ text, className = "" }: { text: string; className?: string }) {
  const [shown, setShown] = React.useState({ text, key: 0 });
  const [leaving, setLeaving] = React.useState<{ text: string; key: number }[]>([]);
  if (text !== shown.text) {
    if (shown.text) setLeaving((l) => [...l, shown]);
    setShown({ text, key: shown.key + 1 });
  }
  return (
    <span className={`relative block ${className}`}>
      <span
        key={shown.key}
        className="block truncate"
        ref={(el) => {
          if (!el || shown.key === 0 || el.dataset.in) return;
          el.dataset.in = "1";
          el.animate(
            [
              { opacity: 0, transform: "translateY(0.35em)", filter: "blur(4px)" },
              { opacity: 1, transform: "none", filter: "blur(0px)" },
            ],
            { duration: 380, delay: 60, easing: EASE, fill: "backwards" },
          );
        }}
      >
        {shown.text || " "}
      </span>
      {leaving.map((l) => (
        <span
          key={l.key}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 block truncate"
          ref={(el) => {
            if (!el || el.dataset.out) return;
            el.dataset.out = "1";
            el.animate(
              [
                { opacity: 1, filter: "blur(0px)" },
                { opacity: 0, filter: "blur(4px)" },
              ],
              { duration: 180, easing: EASE, fill: "forwards" },
            ).onfinish = () => setLeaving((all) => all.filter((x) => x.key !== l.key));
          }}
        >
          {l.text}
        </span>
      ))}
    </span>
  );
}

type RowActions<T> = {
  click: (e: React.MouseEvent, node: T) => void;
  toggle: (node: T) => void;
  key: (e: React.KeyboardEvent, node: T) => void;
  focus: (node: T) => void;
  rename: (node: T) => void;
  commitRename: (node: T, title: string) => void;
  cancelRename: () => void;
  add: (node: T) => void;
  remove: (node: T) => void;
  icon: (node: T, state: { expanded: boolean; hasChildren: boolean }) => React.ReactNode;
};

/** One row, memoised on plain values: opening a folder or carrying a row re-renders only the rows it changes. */
function TreeRowView<T extends TreeNode>({
  node,
  depth,
  hasChildren,
  open,
  pos,
  size,
  selected,
  tab,
  dimmed,
  renaming,
  canAdd,
  canDelete,
  canRename,
  indent,
  reduced,
  actions,
}: {
  node: T;
  depth: number;
  hasChildren: boolean;
  open: boolean;
  pos: number;
  size: number;
  selected: boolean;
  tab: boolean;
  dimmed: boolean;
  renaming: boolean;
  canAdd: boolean;
  canDelete: boolean;
  canRename: boolean;
  indent: number;
  reduced: boolean;
  actions: React.RefObject<RowActions<T>>;
}) {
  const holds = !node.leaf;
  return (
    <li
      data-row-id={node.id}
      data-depth={depth}
      data-parent={node.parent ?? ""}
      data-can-hold={holds ? "1" : "0"}
      data-expanded={open ? "1" : "0"}
      data-has-children={hasChildren ? "1" : "0"}
      role="treeitem"
      aria-level={depth + 1}
      aria-setsize={size}
      aria-posinset={pos}
      aria-expanded={holds ? open : undefined}
      aria-selected={selected}
      tabIndex={tab ? 0 : -1}
      onKeyDown={(e) => actions.current.key(e, node)}
      onFocus={(e) => e.target === e.currentTarget && actions.current.focus(node)}
      onClick={(e) => actions.current.click(e, node)}
      onDoubleClick={() => canRename && actions.current.rename(node)}
      className={`group/row relative shrink-0 cursor-default select-none rounded-[8px] outline-none [-webkit-touch-callout:none] ${FOCUS}`}
      style={{ height: ROW_H, opacity: dimmed ? 0.4 : 1, transition: reduced ? "none" : `opacity 160ms ${EASE}` }}
    >
      <div
        data-row-content
        className={`flex h-full items-center gap-1.5 rounded-[8px] pr-1 text-[13.5px] transition-colors duration-150 ${selected ? "bg-accent font-medium text-foreground" : "text-foreground/85 hover:bg-accent/60"}`}
        style={{ paddingLeft: 4 + depth * indent }}
      >
        {holds ? (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={(e) => {
              e.stopPropagation();
              actions.current.toggle(node);
            }}
            className={`flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground ${hasChildren ? "" : "opacity-40"}`}
          >
            <ChevronRight className="size-3.5" strokeWidth={2} style={{ transform: open ? "rotate(90deg)" : "none", transition: reduced ? "none" : `transform 260ms ${EASE}` }} />
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden="true" />
        )}
        <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4" aria-hidden="true">
          {actions.current.icon(node, { expanded: open, hasChildren })}
        </span>
        {renaming ? (
          <input
            autoFocus
            defaultValue={node.title}
            aria-label={`Rename ${node.title}`}
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") actions.current.commitRename(node, e.currentTarget.value);
              if (e.key === "Escape") actions.current.cancelRename();
            }}
            onBlur={(e) => actions.current.commitRename(node, e.currentTarget.value)}
            className="-ml-1 h-6 min-w-0 flex-1 rounded-[6px] bg-background px-1 text-[13.5px] font-normal outline-none shadow-[inset_0_0_0_1px_var(--ring)] [@media(pointer:coarse)]:text-[16px]"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate">{node.title}</span>
        )}
        {!renaming && (canAdd || canDelete) && (
          // Shown on hover and focus; on touch screens, on the chosen row.
          <span className={`flex shrink-0 items-center opacity-0 transition-opacity duration-150 group-hover/row:opacity-100 group-focus-within/row:opacity-100 ${selected ? "[@media(pointer:coarse)]:opacity-100" : "[@media(pointer:coarse)]:hidden"}`}>
            {canDelete && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Delete ${node.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  actions.current.remove(node);
                }}
                className="flex size-6 cursor-pointer items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Trash2 className="size-3.5" strokeWidth={1.75} />
              </button>
            )}
            {canAdd && holds && (
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Add inside ${node.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  actions.current.add(node);
                }}
                className="flex size-6 cursor-pointer items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Plus className="size-3.5" strokeWidth={1.75} />
              </button>
            )}
          </span>
        )}
      </div>
    </li>
  );
}

const TreeRow = React.memo(TreeRowView) as typeof TreeRowView;

const defaultIcon = (node: TreeNode, { expanded, hasChildren }: { expanded: boolean; hasChildren: boolean }) =>
  node.leaf ? <File strokeWidth={1.75} /> : expanded && hasChildren ? <FolderOpen strokeWidth={1.75} /> : <Folder strokeWidth={1.75} />;

export function TreeView<T extends TreeNode>({
  nodes: controlled,
  defaultNodes,
  onNodesChange,
  expanded: expandedProp,
  defaultExpanded = NO_IDS,
  onExpandedChange,
  selected: selectedProp,
  defaultSelected = null,
  onSelect,
  icon = defaultIcon,
  canDrop,
  onMove,
  onRename,
  onCreate,
  onDelete,
  addLabel = "page",
  undoFor = 5000,
  indent = 14,
  label = "Pages",
  className = "",
  ...props
}: TreeViewProps<T>) {
  const reduced = useReducedMotion();
  const uid = React.useId();
  const [own, setOwn] = React.useState<T[]>(defaultNodes ?? []);
  const nodes = controlled ?? own;
  const nodesRef = React.useRef(nodes);
  const [openOwn, setOpenOwn] = React.useState<string[]>(defaultExpanded);
  const openIds = expandedProp ?? openOwn;
  const open = React.useMemo(() => new Set(openIds), [openIds]);
  const openRef = React.useRef(open);

  React.useLayoutEffect(() => {
    nodesRef.current = nodes;
    openRef.current = open;
  });

  const [selOwn, setSelOwn] = React.useState<string | null>(defaultSelected);
  const selected = selectedProp === undefined ? selOwn : selectedProp;
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const [lifted, setLifted] = React.useState<string | null>(null);
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<{ parent: string | null; key: number } | null>(null);
  const [note, setNote] = React.useState<Note | null>(null);
  const [undo, setUndo] = React.useState<Undo<T> | null>(null);
  const [holdUndo, setHoldUndo] = React.useState(false);
  const [announce, setAnnounce] = React.useState("");

  const noteSeq = React.useRef(0);
  const draftSeq = React.useRef(0);
  const undoSeq = React.useRef(0);

  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const ghostRef = React.useRef<HTMLDivElement>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const reasonRef = React.useRef<HTMLParagraphElement>(null);
  const lineRef = React.useRef<HTMLDivElement>(null);
  const ringRef = React.useRef<HTMLDivElement>(null);
  /** Rows that should glide in from somewhere other than their old place (a drop, a depth change). */
  const landing = React.useRef<{ id?: string; from?: { x: number; y: number }; depths: Map<string, { depth: number; top: number }> } | null>(null);
  const sprung = React.useRef<Set<string>>(new Set());
  const refocus = React.useRef<string | null>(null);
  const typed = React.useRef({ text: "", at: 0 });
  const renamingRef = React.useRef<string | null>(null);

  const say = (text: string) => setAnnounce((a) => (a === text ? `${text} ` : text));
  const warn = (text: string, tone: Note["tone"] = "warn") => {
    const key = ++noteSeq.current;
    setNote({ text, tone, key });
    window.setTimeout(() => setNote((n) => (n?.key === key ? null : n)), 3600);
  };
  const nodeMap = React.useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const byId = React.useCallback((id: string | null) => (id ? nodeMap.get(id) ?? null : null), [nodeMap]);

  const commit = (next: T[]) => {
    nodesRef.current = next;
    if (controlled === undefined) setOwn(next);
    onNodesChange?.(next);
  };
  const setOpenIds = (next: Set<string>) => {
    openRef.current = next;
    const ids = [...next];
    if (expandedProp === undefined) setOpenOwn(ids);
    onExpandedChange?.(ids);
  };
  const select = (node: T) => {
    if (selectedProp === undefined) setSelOwn(node.id);
    onSelect?.(node);
  };

  // ── The rows in view ───────────────────────────────────
  const rows = React.useMemo(() => {
    const kids = new Map<string | null, T[]>();
    for (const n of nodes) {
      const list = kids.get(n.parent);
      if (list) list.push(n);
      else kids.set(n.parent, [n]);
    }
    const out: Row<T>[] = [];
    const walk = (parent: string | null, depth: number) => {
      const list = kids.get(parent) ?? [];
      list.forEach((node, i) => {
        const hasChildren = (kids.get(node.id)?.length ?? 0) > 0;
        const isOpen = !node.leaf && open.has(node.id);
        out.push({ kind: "node", node, depth, hasChildren, open: isOpen, pos: i + 1, size: list.length });
        if (!isOpen) return;
        walk(node.id, depth + 1);
        if (draft?.parent === node.id) out.push({ kind: "draft", parent: node.id, depth: depth + 1 });
        else if (!hasChildren) out.push({ kind: "empty", parent: node.id, depth: depth + 1 });
      });
    };
    walk(null, 0);
    if (draft && draft.parent === null) out.push({ kind: "draft", parent: null, depth: 0 });
    return out;
  }, [nodes, open, draft]);
  const nodeRows = rows.filter((r): r is Extract<Row<T>, { kind: "node" }> => r.kind === "node");
  const tabId = (focusId && nodeRows.some((r) => r.node.id === focusId) ? focusId : null) ?? (selected && nodeRows.some((r) => r.node.id === selected) ? selected : nodeRows[0]?.node.id);

  useRowMotion(listRef, { reduced, ranks: NO_RANKS, ghosts: ghostRef });

  // After a drop or a keyboard move: the moved row comes from where it was let go, rows that changed depth slide sideways.
  React.useLayoutEffect(() => {
    const l = landing.current;
    const list = listRef.current;
    landing.current = null;
    if (!l || !list || reduced) return;
    list.querySelectorAll<HTMLElement>("[data-row-id][data-depth]").forEach((el) => {
      const id = el.dataset.rowId!;
      const was = l.depths.get(id);
      if (!was) return;
      const depth = Number(el.dataset.depth);
      if (id === l.id && l.from) {
        el.animate([{ transform: `translate(${l.from.x + (was.depth - depth) * indent}px, ${l.from.y - was.top}px)` }, { transform: "translate(0px, 0px)" }], { duration: GLIDE, easing: EASE, composite: "add" });
        return;
      }
      if (was.depth !== depth) el.querySelector<HTMLElement>("[data-row-content]")?.animate([{ transform: `translateX(${(was.depth - depth) * indent}px)` }, { transform: "translateX(0px)" }], { duration: GLIDE, easing: EASE, composite: "add" });
    });
  });

  // Keep focus on a row that moved (React re-inserts it) or was renamed.
  React.useLayoutEffect(() => {
    const id = refocus.current;
    if (!id) return;
    refocus.current = null;
    listRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(id)}"]`)?.focus({ preventScroll: false });
  });

  const snapshot = () => {
    const depths = new Map<string, { depth: number; top: number }>();
    listRef.current?.querySelectorAll<HTMLElement>("[data-row-id][data-depth]").forEach((el) => depths.set(el.dataset.rowId!, { depth: Number(el.dataset.depth), top: el.offsetTop }));
    return depths;
  };

  /** Why a row can't go into parent, or null. */
  const refusal = (node: T, parent: T | null) => {
    if (parent?.leaf) return `${parent.title} can't hold other rows`;
    if (parent && (parent.id === node.id || under(nodesRef.current, node.id).has(parent.id))) return `Can't move ${node.title} inside itself`;
    return (canDrop?.(node, parent) as string | null | undefined) || null;
  };

  /** Moves a row (optimistically) and saves it; a failed save puts everything back. */
  const moveTo = async (node: T, parent: string | null, after: string | null | "end", from?: { x: number; y: number }) => {
    const previous = nodesRef.current;
    const next = place(previous, node.id, parent, after);
    landing.current = { id: node.id, from, depths: snapshot() };
    // The row stays in view: its new parent opens. Rows that only opened while it was carried close again.
    const ids = new Set(openRef.current);
    sprung.current.forEach((id) => id !== parent && ids.delete(id));
    sprung.current.clear();
    if (parent) ids.add(parent);
    setOpenIds(ids);
    commit(next);
    const parentNode = byId(parent);
    const sibs = next.filter((n) => n.parent === parent);
    const index = sibs.findIndex((n) => n.id === node.id);
    say(`Moved ${node.title} ${parentNode ? `into ${parentNode.title}` : "to the top level"}, ${index + 1} of ${sibs.length}.`);
    if (!onMove) return;
    try {
      await onMove({ ...node, parent } as T, parentNode, index);
    } catch {
      landing.current = { depths: snapshot() };
      commit(place(nodesRef.current, node.id, node.parent, (() => {
        const before = previous.filter((n) => n.parent === node.parent);
        const i = before.findIndex((n) => n.id === node.id);
        return i > 0 ? before[i - 1].id : null;
      })()));
      warn(`Couldn't move ${node.title}. It's back.`, "error");
      say(`Couldn't move ${node.title}. It's back where it was.`);
      window.setTimeout(() => {
        if (reduced) return;
        listRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(node.id)}"] [data-row-content]`)?.animate(
          [{ transform: "none" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(-2px)" }, { transform: "none" }],
          { duration: 380, easing: "ease-out" },
        );
      }, GLIDE);
    }
  };

  // ── Carrying ───────────────────────────────────────────
  const drag = useTreeDrag({
    list: listRef,
    scroller: scrollerRef,
    preview: previewRef,
    reason: reasonRef,
    line: lineRef,
    ring: ringRef,
    indent,
    inset: INSET,
    check: (id, target) => {
      const node = byId(id) as T | null;
      if (!node) return { same: true, refused: null };
      const parent = byId(target.parent) as T | null;
      const next = place(nodesRef.current, id, target.parent, target.into ? "end" : target.after);
      const was = nodesRef.current.filter((n) => n.parent === node.parent).findIndex((n) => n.id === id);
      const now = next.filter((n) => n.parent === target.parent).findIndex((n) => n.id === id);
      return { same: target.parent === node.parent && was === now, refused: refusal(node, parent) };
    },
    onLift: (id) => {
      setLifted(id);
      setRenaming(null);
      const node = byId(id);
      if (node) say(`Carrying ${node.title}.`);
    },
    onSpring: (id) => {
      sprung.current.add(id);
      const ids = new Set(openRef.current);
      ids.add(id);
      setOpenIds(ids);
    },
    onDrop: (id, target, from) => {
      setLifted(null);
      const node = byId(id) as T | null;
      if (node) moveTo(node, target.parent, target.into ? "end" : target.after, from);
    },
    onCancel: (id, refused) => {
      setLifted(null);
      if (sprung.current.size) {
        const ids = new Set(openRef.current);
        sprung.current.forEach((x) => ids.delete(x));
        sprung.current.clear();
        setOpenIds(ids);
      }
      if (refused) {
        warn(refused);
        say(`${byId(id)?.title ?? "The row"} went back. ${refused}.`);
      }
    },
    reduced,
    disabled: !!renaming || !!draft,
  });

  // The copy appears under the pointer; rows that opened mid-carry are measured again.
  React.useLayoutEffect(() => {
    if (lifted) drag.sync();
  }, [lifted, drag]);
  React.useLayoutEffect(() => {
    drag.remeasure();
  }, [open, drag]);

  // ── Opening, renaming, adding, deleting ────────────────
  const toggle = (node: T, to?: boolean) => {
    if (node.leaf) return;
    const ids = new Set(openRef.current);
    const on = to ?? !ids.has(node.id);
    if (on) ids.add(node.id);
    else ids.delete(node.id);
    setOpenIds(ids);
  };

  const commitRename = async (node: T, value: string) => {
    if (renamingRef.current !== node.id) return;
    renamingRef.current = null;
    setRenaming(null);
    refocus.current = node.id;
    const title = value.trim();
    if (!title || title === node.title) return;
    commit(nodesRef.current.map((n) => (n.id === node.id ? ({ ...n, title } as T) : n)));
    say(`Renamed to ${title}.`);
    try {
      await onRename?.(node, title);
    } catch {
      commit(nodesRef.current.map((n) => (n.id === node.id ? ({ ...n, title: node.title } as T) : n)));
      warn(`Couldn't rename ${node.title}.`, "error");
    }
  };

  const startRename = (node: T) => {
    if (!onRename) return;
    renamingRef.current = node.id;
    setRenaming(node.id);
  };

  const addInside = (parent: T | null) => {
    if (!onCreate) return;
    if (parent) toggle(parent, true);
    setDraft({ parent: parent?.id ?? null, key: ++draftSeq.current });
  };

  const finishDraft = async (title: string) => {
    const d = draft;
    if (!d) return;
    const name = title.trim();
    setDraft(null);
    if (!name || !onCreate) return;
    try {
      const made = await onCreate(byId(d.parent) as T | null, name);
      const node = { ...made, parent: d.parent } as T;
      commit([...nodesRef.current, node]);
      select(node);
      refocus.current = made.id;
      say(`Added ${made.title}.`);
    } catch {
      warn(`Couldn't add “${name}”.`, "error");
    }
  };

  const remove = (node: T) => {
    if (!onDelete) return;
    if (undo) finishUndo(undo);
    const gone = new Set([node.id, ...under(nodesRef.current, node.id)]);
    const previous = nodesRef.current;
    const i = nodeRows.findIndex((r) => r.node.id === node.id);
    const nextFocus = nodeRows.slice(i + 1).find((r) => !gone.has(r.node.id)) ?? nodeRows.slice(0, i).reverse()[0];
    commit(previous.filter((n) => !gone.has(n.id)));
    setUndo({ key: ++undoSeq.current, node, removed: previous.filter((n) => gone.has(n.id)), nodes: previous });
    if (nextFocus) refocus.current = nextFocus.node.id;
    say(`Deleted ${node.title}${gone.size > 1 ? ` and ${gone.size - 1} inside it` : ""}. Undo is below.`);
  };

  const takeBack = () => {
    if (!undo) return;
    const ids = new Set(undo.removed.map((n) => n.id));
    // Back in their old places among whatever is there now.
    const now = nodesRef.current;
    const restored = undo.nodes.filter((n) => ids.has(n.id) || now.some((m) => m.id === n.id)).map((n) => (ids.has(n.id) ? n : now.find((m) => m.id === n.id)!));
    commit([...restored, ...now.filter((n) => !restored.some((r) => r.id === n.id))]);
    setUndo(null);
    refocus.current = undo.node.id;
    say(`${undo.node.title} is back.`);
  };

  const finishUndo = async (u: Undo<T>) => {
    setUndo((x) => (x?.key === u.key ? null : x));
    try {
      await onDelete?.(u.node);
    } catch {
      commit([...nodesRef.current, ...u.removed]);
      warn(`Couldn't delete ${u.node.title}. It's back.`, "error");
    }
  };

  // ── Keys ───────────────────────────────────────────────
  const focusRow = (id: string | undefined) => {
    if (!id) return;
    setFocusId(id);
    listRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(id)}"]`)?.focus();
  };

  const onRowKey = (e: React.KeyboardEvent, node: T) => {
    if (e.target !== e.currentTarget) return;
    const i = nodeRows.findIndex((r) => r.node.id === node.id);
    const row = nodeRows[i];
    if (!row) return;
    const sibs = nodesRef.current.filter((n) => n.parent === node.parent);
    const si = sibs.findIndex((n) => n.id === node.id);

    if (e.altKey && e.key.startsWith("Arrow")) {
      e.preventDefault();
      let to: { parent: string | null; after: string | null | "end" } | null = null;
      if (e.key === "ArrowUp" && si > 0) to = { parent: node.parent, after: si > 1 ? sibs[si - 2].id : null };
      if (e.key === "ArrowDown" && si < sibs.length - 1) to = { parent: node.parent, after: sibs[si + 1].id };
      if (e.key === "ArrowRight" && si > 0 && !sibs[si - 1].leaf) to = { parent: sibs[si - 1].id, after: "end" };
      if (e.key === "ArrowLeft" && node.parent) to = { parent: byId(node.parent)?.parent ?? null, after: node.parent };
      if (!to) return;
      const why = refusal(node, byId(to.parent) as T | null);
      if (why) {
        warn(why);
        say(why);
        return;
      }
      refocus.current = node.id;
      moveTo(node, to.parent, to.after);
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusRow(nodeRows[i + 1]?.node.id);
        return;
      case "ArrowUp":
        e.preventDefault();
        focusRow(nodeRows[i - 1]?.node.id);
        return;
      case "Home":
        e.preventDefault();
        focusRow(nodeRows[0]?.node.id);
        return;
      case "End":
        e.preventDefault();
        focusRow(nodeRows[nodeRows.length - 1]?.node.id);
        return;
      case "ArrowRight":
        e.preventDefault();
        if (!node.leaf && !row.open) toggle(node, true);
        else if (row.open && row.hasChildren) focusRow(nodeRows[i + 1]?.node.id);
        return;
      case "ArrowLeft":
        e.preventDefault();
        if (row.open) toggle(node, false);
        else if (node.parent) focusRow(node.parent);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        select(node);
        return;
      case "F2":
        e.preventDefault();
        startRename(node);
        return;
      case "Delete":
      case "Backspace":
        if (!onDelete) return;
        e.preventDefault();
        remove(node);
        return;
    }
    // Type to jump: the next row whose title starts with what was typed.
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = e.timeStamp;
      typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const t = typed.current.text;
      const order = [...nodeRows.slice(i + (t.length === 1 ? 1 : 0)), ...nodeRows.slice(0, i + (t.length === 1 ? 1 : 0))];
      focusRow(order.find((r) => r.node.title.toLowerCase().startsWith(t))?.node.id);
    }
  };

  // What the memoised rows call, through one ref, so a row never re-renders just because these were re-created.
  const actions = React.useRef<RowActions<T>>({
    click: () => {},
    toggle: () => {},
    key: () => {},
    focus: () => {},
    rename: () => {},
    commitRename: () => {},
    cancelRename: () => {},
    add: () => {},
    remove: () => {},
    icon: icon as RowActions<T>["icon"],
  });

  React.useLayoutEffect(() => {
    actions.current = {
      click: (e, node) => {
        if (drag.swallowClick() || renaming === node.id) return;
        if (e.detail > 1) return;
        setFocusId(node.id);
        select(node);
      },
      toggle: (node) => toggle(node),
      key: onRowKey,
      focus: (node) => setFocusId(node.id),
      rename: startRename,
      commitRename,
      cancelRename: () => {
        if (renamingRef.current) refocus.current = renamingRef.current;
        renamingRef.current = null;
        setRenaming(null);
      },
      add: (node) => addInside(node),
      remove,
      icon: icon as RowActions<T>["icon"],
    };
  });

  const liftedRow = lifted ? nodeRows.find((r) => r.node.id === lifted) : undefined;
  const liftedCount = lifted ? under(nodes, lifted).size : 0;

  return (
    <div className={`@container flex flex-col text-foreground ${className}`} {...props}>
      <div ref={scrollerRef} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:thin]">
        <ul ref={listRef} role="tree" aria-label={label} aria-describedby={`${uid}-how`} {...drag.handlers} className="relative flex flex-col py-0.5">
          {rows.map((r) => {
            if (r.kind === "empty")
              return (
                <li key={`${r.parent}::empty`} data-row-id={`${r.parent}::empty`} role="none" className="flex shrink-0 items-center text-[12.5px] text-muted-foreground" style={{ height: ROW_H, paddingLeft: INSET + r.depth * indent }}>
                  Nothing inside
                </li>
              );
            if (r.kind === "draft")
              return (
                <li key={`draft-${draft?.key}`} data-row-id="__draft" role="none" className="shrink-0" style={{ height: ROW_H }}>
                  <div className="flex h-full items-center gap-1.5 pr-1" style={{ paddingLeft: 4 + r.depth * indent }}>
                    <span className="size-5 shrink-0" aria-hidden="true" />
                    <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4" aria-hidden="true">
                      <File strokeWidth={1.75} />
                    </span>
                    <input
                      autoFocus
                      placeholder={`New ${addLabel}`}
                      aria-label={`New ${addLabel}${r.parent ? ` in ${byId(r.parent)?.title}` : ""}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") finishDraft(e.currentTarget.value);
                        if (e.key === "Escape") {
                          setDraft(null);
                          if (r.parent) refocus.current = r.parent;
                        }
                      }}
                      onBlur={(e) => finishDraft(e.currentTarget.value)}
                      className="-ml-1 h-6 min-w-0 flex-1 rounded-[6px] bg-background px-1 text-[13.5px] outline-none shadow-[inset_0_0_0_1px_var(--ring)] placeholder:text-muted-foreground [@media(pointer:coarse)]:text-[16px]"
                    />
                  </div>
                </li>
              );
            const id = r.node.id;
            return (
              <TreeRow
                key={id}
                node={r.node}
                depth={r.depth}
                hasChildren={r.hasChildren}
                open={r.open}
                pos={r.pos}
                size={r.size}
                selected={selected === id}
                tab={tabId === id}
                dimmed={!!lifted && (lifted === id || (liftedRow ? isUnder(rows, liftedRow, r) : false))}
                renaming={renaming === id}
                canAdd={!!onCreate}
                canDelete={!!onDelete}
                canRename={!!onRename}
                indent={indent}
                reduced={reduced}
                actions={actions}
              />
            );
          })}

          {/* Where it lands: a line from the depth it would take, or a ring round the row it would go inside. */}
          <div ref={lineRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-0.5 opacity-0" style={{ transition: reduced ? "none" : "transform 90ms ease-out, opacity 120ms ease-out" }}>
            <span className="absolute inset-0 rounded-full bg-current" />
            <span className="absolute -left-1 -top-[3px] size-2 rounded-full border-[1.5px] border-current bg-background" />
          </div>
          <div ref={ringRef} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 rounded-[8px] opacity-0" style={{ boxShadow: "inset 0 0 0 1.5px currentColor", background: "color-mix(in oklab, currentColor 8%, transparent)", transition: reduced ? "none" : "opacity 120ms ease-out" }} />

          {/* The copy you carry. */}
          {liftedRow && (
            <div ref={previewRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-10 w-full will-change-transform">
              <div className="flex items-center gap-1.5 rounded-[8px] bg-background pr-2 text-[13.5px] font-medium shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_22%,transparent)]" style={{ height: ROW_H, marginLeft: liftedRow.depth * indent, paddingLeft: 4, width: `min(100% - ${liftedRow.depth * indent}px, 260px)` }}>
                <span className="size-5 shrink-0" />
                <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">{icon(liftedRow.node, { expanded: false, hasChildren: liftedRow.hasChildren })}</span>
                <span className="min-w-0 flex-1 truncate">{liftedRow.node.title}</span>
                {liftedCount > 0 && <span className="shrink-0 rounded-full px-1.5 text-[11px] font-normal tabular-nums text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">+{liftedCount}</span>}
              </div>
              <p ref={reasonRef} hidden className="mt-1 text-[11.5px] font-normal text-amber-700 dark:text-amber-400" style={{ marginLeft: liftedRow.depth * indent + 30 }} />
            </div>
          )}

          {/* Rows that went: their own elements, folding away where they stood (see use-row-motion). */}
          <div ref={ghostRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />
        </ul>
      </div>

      {onCreate && (
        <button
          type="button"
          onClick={() => addInside(null)}
          className={`mt-1 flex h-[30px] shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] pl-1 text-[13px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground ${FOCUS}`}
        >
          <span className="flex size-5 items-center justify-center" aria-hidden="true">
            <Plus className="size-3.5" strokeWidth={1.75} />
          </span>
          New {addLabel}
        </button>
      )}

      {/* One line under the tree: Undo while a delete can still be taken back, or what went wrong. */}
      <div className="grid shrink-0 transition-[grid-template-rows] duration-300" style={{ gridTemplateRows: undo || note ? "1fr" : "0fr", transitionTimingFunction: EASE }}>
        <div className="min-h-0 overflow-hidden">
          {undo ? (
            <div className="relative mt-1.5 flex h-8 items-center gap-2 rounded-[8px] pl-2.5 pr-1 text-[12.5px] shadow-[inset_0_0_0_1px_var(--border)]" onPointerEnter={() => setHoldUndo(true)} onPointerLeave={() => setHoldUndo(false)}>
              <span className="min-w-0 flex-1 truncate">Deleted “{undo.node.title}”</span>
              <button type="button" onClick={takeBack} className={`inline-flex h-6 shrink-0 cursor-pointer items-center rounded-[6px] px-2 font-medium hover:bg-accent ${FOCUS}`}>
                Undo
              </button>
              <span
                key={undo.key}
                aria-hidden="true"
                className="absolute inset-x-2 bottom-0 h-px origin-left bg-foreground/40"
                style={{ animation: `ui-progress ${undoFor}ms linear reverse forwards`, animationPlayState: holdUndo ? "paused" : "running" }}
                onAnimationEnd={() => finishUndo(undo)}
              />
            </div>
          ) : (
            <Line text={note?.text ?? ""} className={`px-2 pt-1.5 text-[12px] ${note?.tone === "error" ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`} />
          )}
        </div>
      </div>

      <p id={`${uid}-how`} className="sr-only">
        Arrow keys move between rows and open them. Alt with the arrow keys moves a row up, down, into the row above or out of its parent. F2 renames, Delete deletes. Drag a row to move it; on a touch screen, hold it first.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}

/** Is `row` inside `parent` (a contiguous run of deeper rows after it)? */
function isUnder<T extends TreeNode>(rows: Row<T>[], parent: Row<T>, row: Row<T>) {
  const a = rows.indexOf(parent);
  const b = rows.indexOf(row);
  if (b <= a) return false;
  for (let k = a + 1; k <= b; k++) if (rows[k].depth <= parent.depth) return false;
  return true;
}
