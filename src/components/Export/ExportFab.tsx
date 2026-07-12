"use client";

import { useEffect, useRef, useState } from "react";

interface ExportAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface ExportFabProps {
  actions: ExportAction[];
  busy?: boolean;
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
  toggle: (
    <svg {...iconProps} strokeWidth={2} className="h-6 w-6">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  ),
};

/**
 * Single bottom-right FAB (speed dial). Expands into a vertical stack of
 * actions — "Add city" plus export/share — when toggled. The main toggle
 * button is always the primary-blue circle; expanded actions are smaller
 * neutral (surface) buttons with outline icons.
 */
export default function ExportFab({ actions, busy }: ExportFabProps) {
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
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3"
    >
      {open && (
        <div className="flex flex-col items-end gap-2">
          {actions.map((action) => (
            <div key={action.key} className="flex items-center gap-2">
              <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground/80 shadow-sm">
                {action.label}
              </span>
              <button
                type="button"
                onClick={() => handleAction(action)}
                aria-label={action.label}
                disabled={busy}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground/80 shadow-md transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
              >
                {action.icon}
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Add city or export"}
        aria-haspopup="true"
        aria-expanded={open}
        disabled={busy}
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 ${
          open ? "rotate-45" : ""
        }`}
      >
        {exportIcons.toggle}
      </button>
    </div>
  );
}
