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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-2xl rounded-xl border-2 border-foreground bg-card p-8 shadow-pop animate-pop-in ${panelClassName}`}
      >
        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full border-2 border-foreground bg-secondary px-4 py-2 text-sm font-medium text-foreground shadow-pop transition-all duration-200 ease-bounce hover:shadow-pop-hover active:shadow-pop-press"
          >
            Close
          </button>
        ) : null}
        {title ? <h3 className="mb-6 pr-20 text-2xl font-heading font-bold">{title}</h3> : null}
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
