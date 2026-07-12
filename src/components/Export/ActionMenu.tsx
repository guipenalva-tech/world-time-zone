"use client";

import { useEffect, useRef, useState } from "react";

interface ExportAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface ActionMenuProps {
  actions: ExportAction[];
  busy?: boolean;
  /** Label for the trigger button (translated by the caller). */
  label: string;
}

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5",
};

export const exportIcons = {
  addCity: (
    <svg {...iconProps} strokeWidth={2}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  ),
  copy: (
    <svg {...iconProps}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  ),
  downloadImage: (
    <svg {...iconProps}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5-9 9" />
    </svg>
  ),
  downloadPdf: (
    <svg {...iconProps}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 17v-4h1.25a1.25 1.25 0 1 1 0 2.5H8.5" />
      <path d="M12.5 17v-4h1a1.5 1.5 0 0 1 0 4h-1z" />
    </svg>
  ),
  share: (
    <svg {...iconProps}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.3 10.7l7.4-4.4" />
      <path d="M8.3 13.3l7.4 4.4" />
    </svg>
  ),
  chevronDown: (
    <svg {...iconProps} className="h-4 w-4" strokeWidth={2.2}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
};

/**
 * Primary "Action" button, always visible in the comparator's top control
 * bar. Opens a dropdown with the same city/export/share actions the old
 * bottom-right speed-dial FAB used to expose.
 */
export default function ActionMenu({ actions, busy, label }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointerDownOutside(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDownOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDownOutside);
    };
  }, [open]);

  function handleAction(action: ExportAction) {
    action.onSelect();
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {label}
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>
          {exportIcons.chevronDown}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-background shadow-xl"
        >
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              onClick={() => handleAction(action)}
              disabled={busy}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-foreground/80 transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
            >
              <span className="text-foreground/60">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
