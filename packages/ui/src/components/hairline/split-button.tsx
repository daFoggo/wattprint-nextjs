"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { TextMorph } from "./text-morph";
import { INTERACTION_FOCUS, interactionIcon, useInteractionReducedMotion } from "./ui-interaction-motion";

export interface SplitMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface SplitButtonProps {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  menuItems: SplitMenuItem[];
  variant?: "primary" | "secondary" | "destructive";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  menuLabel?: string;
  className?: string;
}

// Exact physics & timing from FilterBar
const EASE = "cubic-bezier(0.16,1,0.3,1)";
const UI = "cubic-bezier(0.23,1,0.32,1)";
const OPEN = 280;
const CLOSE = 200;
const ROW_H = 32;

type Phase = "closed" | "opening" | "open" | "closing";
type Box = { left: number; top: number; width: number; height: number };

const variantStyles = {
  primary: {
    container:
      "bg-primary text-primary-foreground",
    action: "hover:bg-primary-foreground/10 active:bg-primary-foreground/15 text-primary-foreground",
    trigger: "hover:bg-primary-foreground/10 active:bg-primary-foreground/15 text-primary-foreground",
    divider: "bg-primary-foreground/25",
  },
  secondary: {
    container:
      "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)]",
    action: "hover:bg-accent active:bg-accent/80 text-foreground",
    trigger: "hover:bg-accent active:bg-accent/80 text-foreground",
    divider: "bg-border",
  },
  destructive: {
    container:
      "bg-red-500/10 text-red-600 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-red-500)_30%,transparent)] dark:text-red-400",
    action: "hover:bg-red-500/15 active:bg-red-500/20 text-red-600 dark:text-red-400",
    trigger: "hover:bg-red-500/15 active:bg-red-500/20 text-red-600 dark:text-red-400",
    divider: "bg-red-500/25",
  },
};

const sizeStyles = {
  sm: {
    height: "h-7 text-[12px] rounded-full",
    actionPad: "pl-3 pr-2 gap-1.5",
    triggerPad: "px-2",
    iconSize: 13,
  },
  md: {
    height: "h-9 text-[13px] rounded-full",
    actionPad: "pl-4 pr-2.5 gap-2",
    triggerPad: "px-2.5",
    iconSize: 14,
  },
  lg: {
    height: "h-10 text-[14px] rounded-full",
    actionPad: "pl-5 pr-3 gap-2.5",
    triggerPad: "px-3",
    iconSize: 16,
  },
};

export function SplitButton({
  label,
  icon,
  onClick,
  menuItems,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  menuLabel = "More actions",
  className = "",
}: SplitButtonProps) {
  const reduced = useInteractionReducedMotion();
  const [phase, setPhase] = React.useState<Phase>("closed");
  const [box, setBox] = React.useState<Box>({ left: 0, top: 0, width: 0, height: 36 });
  const [wrapW, setWrapW] = React.useState(200);
  const [panelH, setPanelH] = React.useState(0);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const timer = React.useRef<number>(0);

  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const inert = disabled || loading;
  const mounted = phase !== "closed";
  const expanded = phase === "open";

  // Open the morphing floating dropdown from the trigger pill
  const openMenu = () => {
    const wrap = wrapRef.current;
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
    setWrapW(w.width);
    setActiveIndex(0);
    setPhase(reduced ? "open" : "opening");
  };

  const closeMenu = React.useCallback(
    (refocus = true) => {
      window.clearTimeout(timer.current);
      if (refocus) {
        triggerRef.current?.focus({ preventScroll: true });
      }
      if (reduced) {
        setPhase("closed");
        return;
      }
      setPhase("closing");
      timer.current = window.setTimeout(() => {
        setPhase("closed");
      }, CLOSE);
    },
    [reduced],
  );

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

  // Clean timer on unmount
  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  // Measure content height dynamically
  React.useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const measure = () => setPanelH(panel.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [menuItems, mounted]);

  // Close on outside pointer click
  React.useEffect(() => {
    if (!mounted || phase === "closing") return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        closeMenu(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [mounted, phase, closeMenu]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!mounted || phase === "closing") {
      if (e.key === "ArrowDown" && document.activeElement === triggerRef.current) {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < menuItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : menuItems.length - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(menuItems.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const current = menuItems[activeIndex];
      if (current && !current.disabled) {
        closeMenu(true);
        current.onSelect();
      }
    }
  };

  const handleActionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (inert) {
      e.preventDefault();
      return;
    }
    onClick?.();
  };

  const toggleDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (inert) return;
    if (mounted && phase !== "closing") {
      closeMenu();
    } else {
      openMenu();
    }
  };

  // Dimensions & alignment: matches FilterBar's floating panel geometry
  const PANEL_W = 184;
  const menuWidth = Math.min(PANEL_W, Math.max(160, wrapW));
  const targetLeft = Math.max(0, box.left + box.width - menuWidth);
  const targetTop = box.top + box.height + 6;

  return (
    <div
      ref={wrapRef}
      onKeyDown={handleKeyDown}
      className={`relative isolate inline-flex select-none items-stretch transition-[scale] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] has-[button:active:not(:disabled)]:scale-[0.98] motion-reduce:transition-none motion-reduce:has-[button:active]:scale-100 ${s.height} ${v.container} ${
        disabled ? "opacity-45" : ""
      } ${className}`}
    >
      {/* Primary Action Button */}
      <button
        type="button"
        disabled={inert}
        onClick={handleActionClick}
        aria-busy={loading || undefined}
        className={`relative inline-flex items-center justify-center whitespace-nowrap rounded-l-full font-medium transition-colors duration-200 cursor-pointer disabled:cursor-default ${s.actionPad} ${v.action} ${INTERACTION_FOCUS}`}
      >
        {/* The slot opens for an icon or the spinner; they trade places through a blur. */}
        <span
          aria-hidden="true"
          className="relative flex shrink-0 items-center justify-center"
          style={{
            width: icon || loading ? s.iconSize : 0,
            height: s.iconSize,
            marginRight: icon || loading ? 6 : 0,
            transition: reduced ? "none" : `width 380ms ${EASE}, margin-right 380ms ${EASE}`,
          }}
        >
          <span className="absolute inset-0 flex items-center justify-center" style={interactionIcon(!loading, reduced)}>
            {icon}
          </span>
          <span className="absolute inset-0 flex items-center justify-center" style={interactionIcon(loading, reduced)}>
            <span className={`size-3 rounded-full border-[1.5px] border-current border-t-transparent ${loading ? "animate-spin" : ""}`} />
          </span>
        </span>
        <TextMorph>{label}</TextMorph>
      </button>

      {/* Quiet Hairline Divider */}
      <span aria-hidden="true" className={`w-px my-1.5 self-stretch ${v.divider}`} />

      {/* Dropdown Chevron Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={inert}
        onClick={toggleDropdown}
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={mounted && phase !== "closing"}
        className={`relative inline-flex items-center justify-center rounded-r-full transition-colors duration-200 cursor-pointer disabled:cursor-default ${s.triggerPad} ${v.trigger} ${INTERACTION_FOCUS}`}
      >
        <ChevronDown
          size={s.iconSize}
          strokeWidth={1.75}
          style={{
            transform: mounted && phase !== "closing" ? "rotate(180deg)" : "none",
            transition: reduced ? "none" : `transform 300ms ${EASE}`,
          }}
        />
      </button>

      {/* Floating Panel: Morphs out from under the trigger pill with HairlineUI physics */}
      {mounted && (
        <div
          role="menu"
          aria-label={menuLabel}
          className="absolute z-50 overflow-hidden bg-popover text-popover-foreground"
          style={{
            top: targetTop,
            left: expanded ? targetLeft : box.left,
            width: expanded ? menuWidth : box.width,
            height: expanded ? panelH : box.height,
            borderRadius: expanded ? 12 : box.height / 2,
            opacity: expanded ? 1 : 0,
            boxShadow: "0 0 0 1px var(--border)",
            transition: reduced
              ? "none"
              : phase === "closing"
                ? `width ${CLOSE}ms ${UI}, height ${CLOSE}ms ${UI}, left ${CLOSE}ms ${UI}, border-radius ${CLOSE}ms ${UI}, opacity ${CLOSE}ms ${UI}`
                : `width ${OPEN}ms ${UI}, height ${OPEN}ms ${UI}, left ${OPEN}ms ${UI}, border-radius ${OPEN}ms ${UI}, opacity 160ms ${UI}`,
          }}
        >
          <div
            ref={panelRef}
            inert={!expanded ? true : undefined}
            className="relative p-1"
            style={{
              width: menuWidth,
              opacity: expanded ? 1 : 0,
              transition: reduced
                ? "none"
                : expanded
                  ? `opacity 180ms ${EASE} 60ms`
                  : "opacity 90ms ease-out",
            }}
          >
            {/* The Internal Highlight Glides Between Menu Rows */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-1 top-1 h-8 rounded-[7px] bg-accent"
              style={{
                transform: `translateY(${activeIndex * ROW_H}px)`,
                opacity: activeIndex >= 0 && menuItems.length > 0 ? 1 : 0,
                transition: reduced ? "none" : `transform 160ms ${UI}`,
              }}
            />

            {/* Menu Items */}
            {menuItems.map((item, index) => {
              const isDestructive = item.destructive;
              const isSelected = activeIndex === index;

              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  data-menu-item=""
                  disabled={item.disabled}
                  onPointerEnter={() => !item.disabled && setActiveIndex(index)}
                  onClick={() => {
                    closeMenu(false);
                    item.onSelect();
                  }}
                  className={`relative z-10 flex h-8 w-full items-center gap-2 rounded-[7px] px-2.5 text-[13px] font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 select-none text-left ${
                    isDestructive
                      ? isSelected
                        ? "text-red-600 dark:text-red-400 font-semibold"
                        : "text-red-500/90 dark:text-red-400/90"
                      : isSelected
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground"
                  } ${INTERACTION_FOCUS}`}
                >
                  {item.icon && (
                    <span
                      className={`inline-flex size-3.5 shrink-0 items-center justify-center ${
                        isDestructive ? "text-red-500" : "text-muted-foreground"
                      }`}
                    >
                      {item.icon}
                    </span>
                  )}
                  <span className="truncate flex-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SplitButton;
