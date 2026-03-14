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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-2xl rounded-2xl border bg-card p-8 shadow-editorialLg animate-pop-in ${panelClassName}`}
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
        {title ? <h3 className="mb-6 pr-20 font-heading text-3xl font-semibold text-foreground">{title}</h3> : null}
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
