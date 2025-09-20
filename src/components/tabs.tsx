import * as React from "react";

/**
 * Accessible Tabs with:
 * - WAI-ARIA roles/attrs (tablist, tab, tabpanel, aria-selected, aria-controls, aria-labelledby)
 * - ArrowLeft/ArrowRight keyboard navigation (loops)
 * - Optional hash routing sync (via onRouteChange callback)
 *
 * Controlled component:
 *  - value: the current tab id
 *  - onChange: set new tab id
 */
export type TabItem<ID extends string> = {
  id: ID;
  label: string;
  panel: React.ReactNode;
};

type TabsProps<ID extends string> = {
  label?: string;                 // aria-label for the tablist
  value: ID;                      // current active tab id
  onChange: (id: ID) => void;     // handler when tab changes
  items: ReadonlyArray<TabItem<ID>>;
  className?: string;
  pillStyle?: React.CSSProperties;
  activePillStyle?: React.CSSProperties;
};

export function Tabs<ID extends string>({
  label = "Tabs",
  value,
  onChange,
  items,
  className,
  pillStyle,
  activePillStyle,
}: TabsProps<ID>) {
  // Memoize ids for stable order
  const order = React.useMemo(() => items.map((i) => i.id), [items]);

  // Focus movement helper
  const focusTab = (id: ID) => {
    const el = document.getElementById(`tab-${id}`);
    (el as HTMLButtonElement | null)?.focus();
  };

  const move = (dir: 1 | -1) => {
    const idx = order.indexOf(value);
    const next = order[(idx + dir + order.length) % order.length];
    onChange(next as ID);
    focusTab(next as ID);
  };

  return (
    <div className={className}>
      <nav
        role="tablist"
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") move(1);
          else if (e.key === "ArrowLeft") move(-1);
        }}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 18px" }}
      >
        {items.map((t) => {
          const active = value === t.id;
          const tabId = `tab-${t.id}`;
          const panelId = `panel-${t.id}`;
          return (
            <button
              key={t.id}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelId}
              onClick={() => onChange(t.id)}
              style={active ? activePillStyle : pillStyle}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {items.map((t) => {
        const active = value === t.id;
        const panelId = `panel-${t.id}`;
        const tabId = `tab-${t.id}`;
        return (
          <div
            key={t.id}
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId}
            tabIndex={0}
            hidden={!active}
          >
            {active ? t.panel : null}
          </div>
        );
      })}
    </div>
  );
}
