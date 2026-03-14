import { CheckCircle2, ClipboardList } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/common/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EssayGradingCard from '../../components/grading/EssayGradingCard';
import ScoreSummary from '../../components/grading/ScoreSummary';
import * as gradingService from '../../services/gradingService';

const formatSubmissionTime = (value) => {
  if (!value) {
    return 'Not submitted';
  }

  return new Date(value).toLocaleString();
};

const createDraftMap = (answers) =>
  answers.reduce((accumulator, answer) => {
    accumulator[answer._id] = {
      score: answer.score ?? '',
      feedback: answer.feedback ?? '',
    };

    return accumulator;
  }, {});

const attemptTone = {
  pending_essay: 'border-tertiary bg-tertiary/5',
  fully_graded: 'border-quaternary bg-quaternary/5',
};

const GradingPage = () => {
  const [attempts, setAttempts] = useState([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState('');
  const [attemptDetail, setAttemptDetail] = useState(null);
  const [draftScores, setDraftScores] = useState({});
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSavingEssayId, setIsSavingEssayId] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadAttempts = async (preferredAttemptId) => {
    setIsListLoading(true);
    setErrorMessage('');

    try {
      const [pendingEssayAttempts, fullyGradedAttempts] = await Promise.all([
        gradingService.getAttemptsForGrading({ status: 'pending_essay' }),
        gradingService.getAttemptsForGrading({ status: 'fully_graded' }),
      ]);

      const mergedAttempts = [
        ...pendingEssayAttempts.map((attempt) => ({ ...attempt, gradingState: 'pending_essay' })),
        ...fullyGradedAttempts
          .filter((attempt) => !pendingEssayAttempts.some((pendingAttempt) => pendingAttempt._id === attempt._id))
          .map((attempt) => ({ ...attempt, gradingState: 'fully_graded' })),
      ];

      setAttempts(mergedAttempts);

      if (mergedAttempts.length === 0) {
        setSelectedAttemptId('');
        setAttemptDetail(null);
        setDraftScores({});
        return;
      }

      const nextAttemptId =
        preferredAttemptId && mergedAttempts.some((attempt) => attempt._id === preferredAttemptId)
          ? preferredAttemptId
          : selectedAttemptId && mergedAttempts.some((attempt) => attempt._id === selectedAttemptId)
            ? selectedAttemptId
            : mergedAttempts[0]._id;

      setSelectedAttemptId(nextAttemptId);
      await loadAttemptDetail(nextAttemptId);
    } catch (error) {
        setErrorMessage(error.message || 'Unable to load grading queue.');
    } finally {
      setIsListLoading(false);
    }
  };

  const loadAttemptDetail = async (attemptId) => {
    if (!attemptId) {
      return;
    }

    setIsDetailLoading(true);
    setErrorMessage('');

    try {
      const detail = await gradingService.getAttemptDetail(attemptId);
      setAttemptDetail(detail);
      setDraftScores(createDraftMap(detail.answers || []));
    } catch (error) {
        setErrorMessage(error.message || 'Unable to load attempt detail.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    loadAttempts();
  }, []);

  const mcqAnswers = useMemo(
    () => (attemptDetail?.answers || []).filter((answer) => answer.questionId?.type === 'mcq'),
    [attemptDetail],
  );

  const essayAnswers = useMemo(
    () => (attemptDetail?.answers || []).filter((answer) => answer.questionId?.type === 'essay'),
    [attemptDetail],
  );

  const allEssaysGraded = useMemo(
    () => essayAnswers.every((answer) => answer.gradingStatus === 'graded'),
    [essayAnswers],
  );

  const handleSelectAttempt = async (attemptId) => {
    setSelectedAttemptId(attemptId);
    await loadAttemptDetail(attemptId);
  };

  const handleDraftChange = (answerId, field, value) => {
    setDraftScores((current) => ({
      ...current,
      [answerId]: {
        ...current[answerId],
        [field]: value,
      },
    }));
  };

  const handleSaveEssay = async (answer) => {
    const draft = draftScores[answer._id] || { score: '', feedback: '' };
    setIsSavingEssayId(answer._id);
    setErrorMessage('');

    try {
      await gradingService.gradeEssay({
        answerId: answer._id,
        score: Number(draft.score),
        feedback: draft.feedback,
      });

      await loadAttempts(selectedAttemptId);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save essay grade.');
    } finally {
      setIsSavingEssayId('');
    }
  };

  const handleFinalize = async () => {
    if (!selectedAttemptId) {
      return;
    }

    setIsFinalizing(true);
    setErrorMessage('');

    try {
      await gradingService.finalizeAttempt(selectedAttemptId);
      await loadAttempts(selectedAttemptId);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to finalize attempt.');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <DashboardLayout title="Grading">
      <section className="grid gap-8 xl:grid-cols-[360px,1fr]">
        <aside className="editorial-panel p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground bg-tertiary shadow-pop-press">
              <ClipboardList size={20} className="text-foreground" />
            </div>
            <div>
              <h2 className="font-heading text-2xl font-extrabold text-foreground">Attempt Queue</h2>
              <p className="text-sm text-mutedFg">Pending essays and finished grading runs.</p>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {isListLoading ? <LoadingSpinner /> : null}
            {!isListLoading && attempts.length === 0 ? (
              <div className="rounded-[1.5rem] border-2 border-dashed border-border bg-background p-8 text-center">
                <svg viewBox="0 0 120 120" className="mx-auto h-20 w-20" fill="none" aria-hidden="true">
                  <circle cx="60" cy="60" r="38" fill="#A7F3D0" stroke="#1F2937" strokeWidth="4" />
                  <path d="M45 62L55 72L77 48" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="mt-4 font-heading text-xl font-extrabold text-foreground">No attempts to grade</h3>
                <p className="mt-2 text-sm text-mutedFg">Submitted exams will appear here once students complete them.</p>
              </div>
            ) : null}
            {!isListLoading &&
              attempts.map((attempt) => (
                <button
                  key={attempt._id}
                  type="button"
                  onClick={() => handleSelectAttempt(attempt._id)}
                  className={`w-full rounded-[1.5rem] border-2 p-4 text-left shadow-pop-soft transition-all duration-200 ease-bounce ${
                    attemptTone[attempt.gradingState]
                  } ${
                    selectedAttemptId === attempt._id
                      ? 'border-foreground shadow-pop'
                      : 'border-border hover:-translate-y-0.5 hover:shadow-pop-hover'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-lg font-extrabold text-foreground">{attempt.studentId?.name}</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{attempt.testId?.title}</p>
                    </div>
                    {attempt.gradingState === 'fully_graded' ? (
                      <CheckCircle2 size={18} className="text-foreground" />
                    ) : null}
                  </div>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-mutedFg">
                    {attempt.gradingState === 'pending_essay' ? 'Needs essay grading' : 'Fully graded'}
                  </p>
                  <p className="mt-2 text-sm text-mutedFg">Submitted {formatSubmissionTime(attempt.submittedAt)}</p>
                </button>
              ))}
          </div>
        </aside>

        <section className="editorial-panel p-6">
          {isDetailLoading ? <LoadingSpinner /> : null}
          {!isDetailLoading && !attemptDetail ? (
            <div className="flex min-h-[420px] items-center justify-center text-center text-mutedFg">
              Select an attempt to inspect answers and grade essays.
            </div>
          ) : null}

          {!isDetailLoading && attemptDetail ? (
            <div>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="font-heading text-3xl font-extrabold text-foreground">
                    {attemptDetail.studentId?.name} - {attemptDetail.testId?.title}
                  </h2>
                  <p className="mt-2 text-sm text-mutedFg">
                    Submitted {formatSubmissionTime(attemptDetail.submittedAt)}
                  </p>
                </div>
                <div className="w-full max-w-sm">
                  <ScoreSummary
                    score={attemptDetail.score || 0}
                    passingScore={attemptDetail.testId?.passingScore || 0}
                    passed={attemptDetail.passed}
                  />
                </div>
              </div>

              <div className="mt-8">
                <h3 className="font-heading text-2xl font-extrabold text-foreground">MCQ Review</h3>
                {mcqAnswers.length === 0 ? (
                  <div className="mt-4 rounded-[1.5rem] border-2 border-dashed border-border bg-background p-6 text-sm text-mutedFg">
                    No MCQ answers for this attempt.
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-y-3">
                      <thead>
                        <tr>
                          {['Question', 'Student Answer', 'Correct Answer', 'Score'].map((heading) => (
                            <th key={heading} className="px-4 text-left text-xs font-bold uppercase tracking-[0.22em] text-mutedFg">
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mcqAnswers.map((answer) => (
                          <tr key={answer._id}>
                            <td className="rounded-l-[1.25rem] border-y-2 border-l-2 border-border bg-background px-4 py-4 text-sm text-foreground">
                              {answer.questionId?.content}
                            </td>
                            <td className="border-y-2 border-border bg-background px-4 py-4 text-sm text-mutedFg">
                              {answer.selectedOptionId?.text || 'Not answered'}
                            </td>
                            <td className="border-y-2 border-border bg-background px-4 py-4 text-sm text-mutedFg">
                              {answer.correctAnswers?.length ? answer.correctAnswers.join(', ') : '-'}
                            </td>
                            <td className="rounded-r-[1.25rem] border-y-2 border-r-2 border-border bg-background px-4 py-4">
                              <span
                                className={`inline-flex rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
                                  (answer.score || 0) > 0
                                    ? 'border-quaternary bg-quaternary/20 text-foreground'
                                    : 'border-secondary bg-secondary/20 text-foreground'
                                }`}
                              >
                                {answer.score || 0} / {answer.questionId?.points || 0}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-2xl font-extrabold text-foreground">Essay Grading</h3>
                    <p className="mt-1 text-sm text-mutedFg">Assign essay scores and add actionable feedback.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleFinalize}
                    disabled={!allEssaysGraded || isFinalizing}
                    className={`rounded-full border-2 px-6 py-3 font-bold transition-all duration-200 ease-bounce ${
                      allEssaysGraded && !isFinalizing
                        ? 'border-foreground bg-accent text-accentFg shadow-pop hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press'
                        : 'border-border bg-muted text-mutedFg'
                    }`}
                  >
                    {isFinalizing ? 'Finalizing...' : 'Finalize Attempt'}
                  </button>
                </div>

                {essayAnswers.length === 0 ? (
                  <div className="mt-4 rounded-[1.5rem] border-2 border-dashed border-border bg-background p-6 text-sm text-mutedFg">
                    No essay answers for this attempt.
                  </div>
                ) : (
                  <div className="mt-5 space-y-5">
                    {essayAnswers.map((answer) => (
                      <EssayGradingCard
                        key={answer._id}
                        answer={answer}
                        value={draftScores[answer._id] || { score: '', feedback: '' }}
                        onChange={(field, value) => handleDraftChange(answer._id, field, value)}
                        onSave={() => handleSaveEssay(answer)}
                        isSaving={isSavingEssayId === answer._id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </DashboardLayout>
  );
};

export default GradingPage;
