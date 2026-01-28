import { useEffect, useMemo, useRef, useState } from "react";

const TemplateSelectModal = ({ open, onClose, templates, loading, error, profile, anchor, onConfirm }) => {
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const panelRef = useRef(null);

  const templateItems = useMemo(() => templates || [], [templates]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event) => {
      if (!panelRef.current?.contains(event.target)) {
        setPendingTemplate(null);
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  if (!open) return null;

  const handleClose = () => {
    setPendingTemplate(null);
    onClose?.();
  };

  const anchorTop = anchor?.bottom ?? 120;
  const anchorLeft = anchor?.left ?? 120;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        ref={panelRef}
        className="pointer-events-auto absolute w-[280px] rounded-xl bg-white shadow-xl ring-1 ring-black/10"
        style={{ top: `${anchorTop + 6}px`, left: `${anchorLeft}px` }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-gray-100 text-[10px]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-3 py-2 space-y-2 max-h-[320px] overflow-auto">
          {loading ? <p className="text-[10px] text-ink-muted">Loading templates...</p> : null}
          {error ? <p className="text-[10px] text-red-600">{error}</p> : null}
          {!loading && !error && templateItems.length === 0 ? (
            <p className="text-[10px] text-ink-muted">No templates available.</p>
          ) : null}
          <div className="space-y-1">
            {templateItems.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setPendingTemplate(template)}
                className="w-full text-left rounded-lg px-1.5 py-1 hover:border-accent-primary/50 hover:bg-[#F7FAFF] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-ink truncate">{template.title}</span>
                  <span className="text-[10px] text-ink-muted whitespace-nowrap">
                    {template.profile_count ?? 0} using
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {pendingTemplate ? (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center p-3">
            <div className="bg-white rounded-lg shadow border border-border w-full p-3">
              <p className="text-xs text-ink">
                Change template to <span className="font-semibold">{pendingTemplate.title}</span>?
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingTemplate(null)}
                  className="px-3 h-8 rounded-md border border-border text-xs font-semibold text-ink-muted hover:text-ink"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onConfirm?.(pendingTemplate);
                    setPendingTemplate(null);
                    handleClose();
                  }}
                  className="px-3 h-8 rounded-md bg-accent-primary text-white text-xs font-semibold"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TemplateSelectModal;
