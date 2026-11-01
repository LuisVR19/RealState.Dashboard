"use client";

import { usePanel } from "../panel-provider";

export function ConfirmDialog({ title, body, ok, onOk }: { title: string; body: string; ok: string; onOk?: () => void }) {
  const { close } = usePanel();
  return (
    <div className="dialog-backdrop z-confirm" onClick={close}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ padding: 22 }}>
        <span className="dialog-title">{title}</span>
        <div className="dialog-body" style={{ color: "var(--color-neutral-300)" }}>{body}</div>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={close} style={{ height: 40 }}>Cancelar</button>
          <button className="btn btn-danger" onClick={() => { close(); onOk?.(); }} style={{ height: 40 }}>{ok}</button>
        </div>
      </div>
    </div>
  );
}
