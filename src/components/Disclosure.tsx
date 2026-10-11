import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

/** A closed section whose summary carries the result, so the page shows numbers and the detail stays one click away. */
export function Fold({ title, meta, open, id, children }: { title: ReactNode; meta?: ReactNode; open?: boolean; id?: string; children: ReactNode }) {
  const { hash } = useLocation();
  return (
    <details className="fold" id={id} open={open || (id !== undefined && hash === `#${id}`)}>
      <summary>
        <span>{title}</span>
        {meta !== undefined && meta !== "" ? <span className="fold-meta">{meta}</span> : null}
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}

/** One panel at a time. A link ending in #id opens that panel. */
export function Tabs({ label, tabs }: { label: string; tabs: { id: string; label: string; lang?: string; body: ReactNode }[] }) {
  const { hash } = useLocation();
  const fromHash = tabs.find((tab) => `#${tab.id}` === hash)?.id;
  const [active, setActive] = useState(fromHash ?? tabs[0].id);
  useEffect(() => {
    if (fromHash) setActive(fromHash);
  }, [fromHash]);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  return (
    <div className="tabs">
      <div className="tab-row" role="group" aria-label={label}>
        {tabs.map((tab) => (
          <button key={tab.id} type="button" className="btn on-paper" lang={tab.lang} aria-pressed={tab.id === current.id} onClick={() => setActive(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
      <div id={current.id} className="tab-panel">
        {current.body}
      </div>
    </div>
  );
}
