const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  panelClassName = '',
  contentClassName = '',
  showCloseButton = true,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center py-4">
        <div
          className={`relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-editorialLg animate-pop-in sm:p-8 ${panelClassName}`}
        >
          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-md border border-foreground bg-white px-4 py-2 font-body text-sm font-semibold text-foreground transition-all duration-200 ease-out hover:border-accent hover:text-accent"
            >
              Close
            </button>
          ) : null}
          {title ? <h3 className="mb-6 pr-20 font-heading text-2xl font-semibold text-foreground sm:text-3xl">{title}</h3> : null}
          <div className={`min-h-0 overflow-y-auto pr-1 ${contentClassName}`}>{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
