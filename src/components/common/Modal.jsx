import { X } from "lucide-react";

const Modal = ({ open, onClose, title, children, footer }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-6 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-ink">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? <div className="px-5 py-4 border-t border-border bg-gray-50">{footer}</div> : null}
      </div>
    </div>
  );
};

export default Modal;
