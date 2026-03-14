import { BookText, CheckCircle2, ChevronDown, ChevronUp, CircleX, Info, PenTool } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import DashboardLayout from '../../components/common/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import * as examService from '../../services/examService';

const LAST_RESULT_KEY = 'last_exam_result_attempt';

const formatDuration = (seconds = 0) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
};

const ResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: attemptId } = useParams();
  const [results, setResults] = useState(null);
  const [openSections, setOpenSections] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [showAlreadySubmittedBanner, setShowAlreadySubmittedBanner] = useState(
    Boolean(location.state?.alreadySubmitted),
  );

  useEffect(() => {
    const loadResults = async () => {
      const activeAttemptId = attemptId || sessionStorage.getItem(LAST_RESULT_KEY);

      if (!activeAttemptId) {
        setErrorMessage('No result is available yet.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const nextResults = await examService.getResults(activeAttemptId);
        setResults(nextResults);
        setOpenSections(
          (nextResults.sections || []).reduce((accumulator, section, index) => {
            accumulator[section._id] = index === 0;
            return accumulator;
          }, {}),
        );
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load exam results.');
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [attemptId]);

  useEffect(() => {
    if (!location.state?.alreadySubmitted) {
      return undefined;
    }

    setShowAlreadySubmittedBanner(true);

    const timeoutId = window.setTimeout(() => {
      setShowAlreadySubmittedBanner(false);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [location.state?.alreadySubmitted]);

  const heroTone = useMemo(() => {
    if (results?.attempt?.passed === true) {
      return {
        card: 'shadow-pop-pink',
        badgeTone: 'quaternary',
        badgeText: 'PASSED',
      };
    }

    if (results?.attempt?.passed === false) {
      return {
        card: 'shadow-pop-soft',
        badgeTone: 'secondary',
        badgeText: 'FAILED',
      };
    }

    return {
      card: 'shadow-pop-soft',
      badgeTone: 'tertiary',
      badgeText: 'PENDING',
    };
  }, [results?.attempt?.passed]);

  return (
    <DashboardLayout title="Results">
      {showAlreadySubmittedBanner ? (
        <div className="mb-6 flex items-center gap-2 rounded-lg border-2 border-tertiary bg-tertiary/20 px-4 py-3 text-sm font-medium text-foreground">
          <Info size={18} strokeWidth={2.5} className="text-foreground" />
          <span>You have already completed this exam. Here are your results.</span>
        </div>
      ) : null}

      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/student/dashboard')}
          className="editorial-button-secondary"
        >
          Back to Dashboard
        </button>
      </div>

      {location.state?.message ? (
        <div className="mb-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
          {location.state.message}
        </div>
      ) : null}

      {isLoading ? <LoadingSpinner /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-[2rem] border-2 border-secondary bg-card p-8 text-center shadow-pop-soft">
          <h2 className="font-heading text-3xl font-extrabold text-foreground">Results unavailable</h2>
          <p className="mt-4 text-mutedFg">{errorMessage}</p>
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="mt-6 rounded-full border-2 border-foreground bg-secondary px-5 py-3 font-bold text-foreground shadow-pop"
          >
            Back to Dashboard
          </button>
        </div>
      ) : null}

      {!isLoading && results ? (
        <div className="space-y-8">
          <section className={`rounded-2xl border border-border bg-card p-8 ${heroTone.card}`}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Badge tone={heroTone.badgeTone}>{heroTone.badgeText}</Badge>
                <h2 className="mt-5 font-heading text-4xl font-extrabold text-foreground">
                  {results.attempt.testId?.title}
                </h2>
                <p className="mt-3 text-mutedFg">
                  Submitted on {new Date(results.attempt.submittedAt).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-heading text-6xl font-semibold text-accent">{results.attempt.score || 0}</p>
                <p className="mt-2 text-mutedFg">out of {results.summary?.totalPoints ?? 0} points</p>
                <div className="mt-4 inline-flex rounded-full border border-border bg-muted px-4 py-2 font-body text-sm font-semibold text-foreground shadow-editorialSm">
                  Time taken: {formatDuration(results.summary?.timeTakenSeconds)}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-3">
            {[
              {
                label: 'Correct Answers',
                value: results.summary?.correctCount ?? 0,
                icon: CheckCircle2,
                tone: 'bg-quaternary',
              },
              {
                label: 'Wrong Answers',
                value: results.summary?.wrongCount ?? 0,
                icon: CircleX,
                tone: 'bg-secondary',
              },
              {
                label: 'Essay Pending',
                value: results.summary?.essayPendingCount ?? 0,
                icon: PenTool,
                tone: 'bg-tertiary',
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="relative mt-5 rounded-2xl border border-border bg-card p-6 shadow-editorialMd">
                  <div className={`absolute -top-5 left-6 flex h-14 w-14 items-center justify-center rounded-full border border-border ${item.tone} shadow-editorialSm`}>
                    <Icon size={22} className="text-foreground" />
                  </div>
                  <p className="mt-8 font-editorialMono text-xs font-medium uppercase tracking-[0.15em] text-mutedFg">{item.label}</p>
                  <p className="mt-4 font-heading text-4xl font-semibold text-foreground">{item.value}</p>
                </div>
              );
            })}
          </section>

          <section className="editorial-panel p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground bg-accent shadow-pop-press">
                <BookText size={20} className="text-accentFg" />
              </div>
              <div>
                <h3 className="font-heading text-2xl font-extrabold text-foreground">Question Breakdown</h3>
                <p className="text-sm text-mutedFg">Review each section and its grading outcome.</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {(results.sections || []).map((section) => {
                const isOpen = openSections[section._id];

                return (
                  <div key={section._id} className="rounded-2xl border border-border bg-background">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSections((current) => ({
                          ...current,
                          [section._id]: !current[section._id],
                        }))
                      }
                      className="flex w-full items-center justify-between px-5 py-4 text-left"
                    >
                      <div>
                        <p className="font-heading text-xl font-extrabold text-foreground">{section.title}</p>
                        <p className="mt-1 text-sm text-mutedFg">{section.questions.length} questions</p>
                      </div>
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {isOpen ? (
                      <div className="space-y-4 border-t-2 border-border px-5 py-5">
                        {section.questions.map((question) => (
                          <div
                            key={question._id}
                            className={`rounded-2xl border bg-card p-5 ${
                              question.type === 'mcq'
                                ? question.isCorrect
                                  ? 'border-quaternary bg-quaternary/20'
                                  : 'border-secondary bg-secondary/20'
                                : 'border-border'
                            }`}
                          >
                            <p className="font-heading text-lg font-bold text-foreground">{question.content}</p>
                            <p className="mt-3 text-sm text-mutedFg">Points: {question.score} / {question.points}</p>

                            {question.type === 'mcq' ? (
                              <div className="mt-4 space-y-2 text-sm">
                                <p className="text-foreground">Your answer: {question.selectedOptionText || 'Not answered'}</p>
                                <p className="text-mutedFg">Correct answer: {question.correctAnswers?.join(', ') || '-'}</p>
                              </div>
                            ) : (
                              <div className="mt-4 space-y-3">
                                <div className="rounded-xl border-2 border-border bg-background p-4 text-sm leading-7 text-foreground">
                                  {question.essayText || 'No essay answer submitted.'}
                                </div>
                                {question.gradingStatus === 'graded' ? (
                                  <div className="rounded-xl border-2 border-quaternary bg-quaternary/10 p-4 text-sm text-foreground">
                                    Feedback: {question.feedback || 'No feedback provided.'}
                                  </div>
                                ) : (
                                  <Badge tone="tertiary">Awaiting grading</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </DashboardLayout>
  );
};

export default ResultsPage;

