"use client";

import * as React from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { NumberRoll } from "./number-roll";
import {
  EASE_OUT,
  EASE_THROW,
  INTERACTION_FOCUS,
  INTERACTION_PRESS,
  useInteractionReducedMotion,
} from "./ui-interaction-motion";

export interface FloatingToolItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export interface FloatingMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onSelect: () => void;
}

export interface FloatingButtonGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {
  tools: FloatingToolItem[];
  activeId?: string;
  onToolSelect?: (id: string) => void;
  /** Stepper zoom or counter value (e.g. 100) */
  zoomValue?: number;
  onZoomChange?: (newZoom: number) => void;
  /** Optional secondary menu items opened by trailing chevron */
  menuItems?: FloatingMenuItem[];
  /** Positioning mode */
  dock?: "inline" | "bottom" | "top";
  label?: string;
}

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const UI = "cubic-bezier(0.23, 1, 0.32, 1)";
const OPEN = 280;
const CLOSE = 200;
const ROW_H = 32;

type Phase = "closed" | "opening" | "open" | "closing";
type Box = { left: number; top: number; width: number; height: number };

export function FloatingButtonGroup({
  tools,
  activeId: controlledActiveId,
  onToolSelect,
  zoomValue,
  onZoomChange,
  menuItems,
  dock = "inline",
  label = "Floating toolbar",
  className = "",
  style,
  ...props
}: FloatingButtonGroupProps) {
  const reduced = useInteractionReducedMotion();
  const [internalActiveId, setInternalActiveId] = React.useState<string>(
    tools[0]?.id ?? ""
  );

  // FilterBar-style morphing dropdown state
  const [phase, setPhase] = React.useState<Phase>("closed");
  const [box, setBox] = React.useState<Box>({ left: 0, top: 0, width: 0, height: 36 });
  const [panelH, setPanelH] = React.useState(0);
  const [menuActiveIndex, setMenuActiveIndex] = React.useState(0);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const timer = React.useRef<number>(0);

  const activeTool = controlledActiveId !== undefined ? controlledActiveId : internalActiveId;

  // One indicator for the active tool. Measured from layout offsets (transforms ignored, so a
  // pressed button's scale never skews it) and placed once without a transition.
  const [mark, setMark] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [markReady, setMarkReady] = React.useState(false);
  React.useLayoutEffect(() => {
    const wrap = containerRef.current;
    if (!wrap) return;
    const measure = () => {
      const el = wrap.querySelector<HTMLElement>(`[data-tool-id="${CSS.escape(activeTool)}"]`);
      if (!el) return setMark(null);
      const next = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
      setMark((p) => (p && p.x === next.x && p.y === next.y && p.w === next.w && p.h === next.h ? p : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [activeTool, tools]);
  React.useEffect(() => {
    if (!mark || markReady) return;
    const frame = requestAnimationFrame(() => setMarkReady(true));
    return () => cancelAnimationFrame(frame);
  }, [mark, markReady]);

  // Clean dropdown timer
  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  // FilterBar double-rAF expansion
  React.useEffect(() => {
    if (phase !== "opening") return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setPhase("open"));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [phase]);

  // Measure dropdown panel height
  React.useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const measure = () => setPanelH(panel.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(panel);
    return () => ro.disconnect();
  }, [menuItems, phase]);

  const openDropdown = () => {
    const wrap = containerRef.current;
    const trigger = triggerRef.current;
    if (!wrap || !trigger) return;
    window.clearTimeout(timer.current);
    const a = trigger.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    setBox({
      left: a.left - w.left,
      top: a.top - w.top,
      width: a.width,
      height: a.height,
    });
    setMenuActiveIndex(0);
    setPhase(reduced ? "open" : "opening");
  };

  const closeDropdown = React.useCallback(
    (refocus = true) => {
      window.clearTimeout(timer.current);
      if (refocus) triggerRef.current?.focus({ preventScroll: true });
      if (reduced) {
        setPhase("closed");
        return;
      }
      setPhase("closing");
      timer.current = window.setTimeout(() => setPhase("closed"), CLOSE);
    },
    [reduced]
  );

  // Close dropdown on outside pointer
  React.useEffect(() => {
    if (phase === "closed" || phase === "closing") return;
    const onDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        closeDropdown(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDropdown(true);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [phase, closeDropdown]);

  // Handle keyboard arrows across tools or inside menu
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (phase === "open") {
      if (!menuItems?.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMenuActiveIndex((i) => (i < menuItems.length - 1 ? i + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMenuActiveIndex((i) => (i > 0 ? i - 1 : menuItems.length - 1));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const item = menuItems[menuActiveIndex];
        if (item) {
          closeDropdown(true);
          item.onSelect();
        }
      }
      return;
    }

    const enabled = tools.filter((tool) => !tool.disabled);
    const focusedId = (document.activeElement as HTMLElement | null)?.dataset.toolId;
    const currentIndex = enabled.findIndex((tool) => tool.id === focusedId);
    if (currentIndex < 0) return;

    let next = -1;
    if (e.key === "ArrowRight") next = (currentIndex + 1) % enabled.length;
    else if (e.key === "ArrowLeft") next = (currentIndex - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = enabled.length - 1;

    const nextTool = enabled[next];
    if (nextTool) {
      e.preventDefault();
      containerRef.current?.querySelector<HTMLElement>(`[data-tool-id="${CSS.escape(nextTool.id)}"]`)?.focus();
      handleToolClick(nextTool);
    }
  };

  const handleToolClick = (tool: FloatingToolItem) => {
    if (tool.disabled) return;
    if (controlledActiveId === undefined) setInternalActiveId(tool.id);
    onToolSelect?.(tool.id);
    tool.onClick?.();
  };

  const dockClass =
    dock === "bottom"
      ? "fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
      : dock === "top"
      ? "fixed top-6 left-1/2 -translate-x-1/2 z-40"
      : "relative inline-flex";

  const mounted = phase !== "closed";
  const expanded = phase === "open";
  const MENU_W = 180;
  const targetLeft = Math.max(0, box.left + box.width - MENU_W);
  // A toolbar docked to the bottom opens its menu upward.
  const targetTop = dock === "bottom" ? box.top - 6 - (expanded ? panelH : box.height) : box.top + box.height + 6;

  return (
    <div
      ref={containerRef}
      role="toolbar"
      aria-label={label}
      onKeyDown={handleKeyDown}
      style={style}
      className={`${dockClass} items-center rounded-full p-1 gap-1 select-none isolate bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)] max-w-[calc(100vw-32px)] overflow-visible ${className}`}
      {...props}
    >
      {/* The active tool's indicator, thrown to the next tool with a slight overshoot. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-0 rounded-full bg-accent"
        style={{
          transform: `translate3d(${mark?.x ?? 0}px, ${mark?.y ?? 0}px, 0)`,
          width: mark?.w ?? 0,
          height: mark?.h ?? 0,
          opacity: mark ? 1 : 0,
          transition:
            reduced || !markReady ? "none" : `transform 420ms ${EASE_THROW}, width 380ms ${EASE_OUT}, height 380ms ${EASE_OUT}, opacity 200ms ${EASE_OUT}`,
        }}
      />

      {/* Main Tools Row */}
      {tools.map((tool) => {
        const isActive = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            type="button"
            data-tool-id={tool.id}
            disabled={tool.disabled}
            aria-label={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
            aria-pressed={isActive}
            onClick={() => handleToolClick(tool)}
            tabIndex={isActive || (!tools.some((t) => t.id === activeTool) && tool === tools[0]) ? 0 : -1}
            className={`relative z-10 flex size-8 items-center justify-center rounded-full cursor-pointer disabled:cursor-default disabled:opacity-40 ${INTERACTION_PRESS} ${
              isActive ? "text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            } ${INTERACTION_FOCUS}`}
          >
            <span className="size-4 shrink-0 inline-flex items-center justify-center">
              {tool.icon}
            </span>
          </button>
        );
      })}

      {/* Optional Stepper / Zoom controls */}
      {zoomValue !== undefined && onZoomChange && (
        <>
          <span aria-hidden="true" className="w-px h-4 bg-border shrink-0 mx-0.5" />
          <div className="flex items-center gap-0.5 text-[12px] font-medium tabular-nums text-muted-foreground">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoomValue <= 25}
              onClick={() => onZoomChange(Math.max(25, zoomValue - 10))}
              className={`flex size-8 items-center justify-center rounded-full cursor-pointer hover:bg-accent/60 hover:text-foreground disabled:cursor-default disabled:opacity-40 ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
            >
              <Minus size={14} strokeWidth={1.75} />
            </button>
            <span className="min-w-[42px] text-center text-foreground">
              <NumberRoll value={zoomValue} suffix="%" />
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoomValue >= 300}
              onClick={() => onZoomChange(Math.min(300, zoomValue + 10))}
              className={`flex size-8 items-center justify-center rounded-full cursor-pointer hover:bg-accent/60 hover:text-foreground disabled:cursor-default disabled:opacity-40 ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
            >
              <Plus size={14} strokeWidth={1.75} />
            </button>
          </div>
        </>
      )}

      {/* Optional Dropdown Menu Trigger */}
      {menuItems && menuItems.length > 0 && (
        <>
          <span aria-hidden="true" className="w-px h-4 bg-border shrink-0 mx-0.5" />
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={mounted && phase !== "closing"}
            aria-label="Toolbar options"
            onClick={(e) => {
              e.stopPropagation();
              if (mounted && phase !== "closing") closeDropdown();
              else openDropdown();
            }}
            className={`relative z-10 flex size-8 items-center justify-center rounded-full cursor-pointer text-muted-foreground hover:bg-accent/60 hover:text-foreground ${INTERACTION_PRESS} ${INTERACTION_FOCUS}`}
          >
            <ChevronDown
              size={13}
              strokeWidth={1.75}
              style={{
                transform: mounted && phase !== "closing" ? "rotate(180deg)" : "none",
                transition: reduced ? "none" : `transform 300ms ${EASE}`,
              }}
            />
          </button>
        </>
      )}

      {/* FilterBar Morphing Dropdown Panel */}
      {mounted && menuItems && menuItems.length > 0 && (
        <div
          role="menu"
          className="absolute z-50 overflow-hidden bg-popover text-popover-foreground"
          style={{
            top: targetTop,
            left: expanded ? targetLeft : box.left,
            width: expanded ? MENU_W : box.width,
            height: expanded ? panelH : box.height,
            borderRadius: expanded ? 12 : box.height / 2,
            opacity: expanded ? 1 : 0,
            boxShadow: "0 0 0 1px var(--border)",
            transition: reduced
              ? "none"
              : phase === "closing"
                ? `width ${CLOSE}ms ${UI}, height ${CLOSE}ms ${UI}, left ${CLOSE}ms ${UI}, top ${CLOSE}ms ${UI}, border-radius ${CLOSE}ms ${UI}, opacity ${CLOSE}ms ${UI}`
                : `width ${OPEN}ms ${UI}, height ${OPEN}ms ${UI}, left ${OPEN}ms ${UI}, top ${OPEN}ms ${UI}, border-radius ${OPEN}ms ${UI}, opacity 160ms ${UI}`,
          }}
        >
          <div
            ref={panelRef}
            inert={!expanded ? true : undefined}
            className="relative p-1"
            style={{
              width: MENU_W,
              opacity: expanded ? 1 : 0,
              transition: reduced
                ? "none"
                : expanded
                  ? `opacity 180ms ${EASE} 60ms`
                  : "opacity 90ms ease-out",
            }}
          >
            {/* Gliding Row Highlight inside Menu */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-1 top-1 h-8 rounded-[7px] bg-accent"
              style={{
                transform: `translateY(${menuActiveIndex * ROW_H}px)`,
                opacity: menuActiveIndex >= 0 ? 1 : 0,
                transition: reduced ? "none" : `transform 160ms ${UI}`,
              }}
            />

            {menuItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onPointerEnter={() => setMenuActiveIndex(index)}
                onClick={() => {
                  closeDropdown(false);
                  item.onSelect();
                }}
                className={`relative z-10 flex h-8 w-full items-center gap-2 rounded-[7px] px-2.5 text-[13px] font-medium transition-colors cursor-pointer select-none text-left ${
                  item.destructive
                    ? menuActiveIndex === index
                      ? "text-red-600 dark:text-red-400 font-semibold"
                      : "text-red-500/90"
                    : menuActiveIndex === index
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground"
                } ${INTERACTION_FOCUS}`}
              >
                {item.icon && (
                  <span className="inline-flex size-3.5 shrink-0 items-center justify-center text-muted-foreground">
                    {item.icon}
                  </span>
                )}
                <span className="truncate flex-1">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FloatingButtonGroup;
