import Badge from '../common/Badge';
import Modal from '../common/Modal';

const SubmitConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  unansweredCount,
  isSubmitting = false,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Submit Exam">
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <p className="text-sm text-mutedFg">You are about to submit your attempt.</p>
        <Badge tone="tertiary">{unansweredCount} unanswered</Badge>
      </div>

      {unansweredCount > 0 ? (
        <div className="rounded-[1.25rem] border-2 border-tertiary bg-tertiary/10 p-4 text-sm text-foreground">
          Some questions are still unanswered. You can still submit now, but those responses may receive no credit.
        </div>
      ) : (
        <div className="rounded-[1.25rem] border-2 border-quaternary bg-quaternary/10 p-4 text-sm text-foreground">
          All questions have responses. You are ready to submit.
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border-2 border-foreground bg-secondary px-5 py-3 font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
        >
          Go Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="rounded-full border-2 border-foreground bg-accent px-5 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Exam'}
        </button>
      </div>
    </div>
  </Modal>
);

export default SubmitConfirmModal;
