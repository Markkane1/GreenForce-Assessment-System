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
        <p className="font-body text-sm text-mutedFg">You are about to submit your attempt.</p>
        <Badge tone="tertiary">{unansweredCount} unanswered</Badge>
      </div>

      {unansweredCount > 0 ? (
        <div className="rounded-2xl border border-tertiary bg-tertiary/10 p-4 font-body text-sm text-foreground">
          Some questions are still unanswered. You can still submit now, but those responses may receive no credit.
        </div>
      ) : (
        <div className="rounded-2xl border border-quaternary bg-quaternary/10 p-4 font-body text-sm text-foreground">
          All questions have responses. You are ready to submit.
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="editorial-button-secondary">
          Go Back
        </button>
        <button type="button" onClick={onConfirm} disabled={isSubmitting} className="editorial-button-primary">
          {isSubmitting ? 'Submitting...' : 'Submit Exam'}
        </button>
      </div>
    </div>
  </Modal>
);

export default SubmitConfirmModal;
