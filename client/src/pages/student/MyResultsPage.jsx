import { ArrowRight, BookOpen, History } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import DashboardLayout from '../../components/common/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getMyAttempts } from '../../services/examService';

const formatSubmittedDate = (submittedAt) => {
  if (!submittedAt) {
    return 'Submission time unavailable';
  }

  return new Date(submittedAt).toLocaleString();
};

const getResultTone = (attempt) => {
  if (attempt.resultStatus === 'pending' || attempt.pendingEssayCount > 0) {
    return { tone: 'tertiary', label: 'Pending' };
  }

  if (attempt.passed) {
    return { tone: 'quaternary', label: 'Passed' };
  }

  return { tone: 'secondary', label: 'Failed' };
};

const MyResultsPage = () => {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadAttempts = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const pastAttempts = await getMyAttempts();
        setAttempts(pastAttempts);
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load your results.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAttempts();
  }, []);

  return (
    <DashboardLayout title="My Results">
      <section className="editorial-page-header">
        <div>
          <div className="editorial-section-label">
            <span>Results</span>
          </div>
          <h2 className="editorial-page-title">My Results</h2>
          <p className="editorial-page-copy">
            Review submitted exams, attempted-question counts, marks obtained, and pass or fail status.
          </p>
        </div>
      </section>

      {errorMessage ? (
        <div className="mt-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8 editorial-panel p-6">
        {isLoading ? <LoadingSpinner /> : null}

        {!isLoading && attempts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center shadow-editorialMd">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted shadow-editorialSm">
              <History size={24} strokeWidth={2.5} className="text-foreground" />
            </div>
            <h4 className="mt-5 font-heading text-2xl font-extrabold text-foreground">No submitted exams yet</h4>
            <p className="mt-2 text-mutedFg">Your submitted exam results will appear here.</p>
          </div>
        ) : null}

        {!isLoading && attempts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="editorial-table">
              <thead>
                <tr>
                  {['Sr. No.', 'Test', 'Submitted', 'Questions Attempted', 'Marks Obtained', 'Status', 'Action'].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt, index) => {
                  const resultBadge = getResultTone(attempt);

                  return (
                  <tr key={attempt.attemptId}>
                    <td className="rounded-l-[1.25rem] border-y-2 border-l-2 border-border bg-background px-4 py-4">
                      <span className="text-sm font-semibold text-foreground">{index + 1}</span>
                    </td>
                    <td className="border-y-2 border-border bg-background px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted shadow-editorialSm">
                          <BookOpen size={16} strokeWidth={2.5} className="text-accent" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{attempt.testTitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="border-y-2 border-border bg-background px-4 py-4 text-sm text-mutedFg">
                      {formatSubmittedDate(attempt.submittedAt)}
                    </td>
                    <td className="border-y-2 border-border bg-background px-4 py-4 text-sm font-semibold text-foreground">
                      {attempt.questionsAttempted || 0}
                    </td>
                    <td className="border-y-2 border-border bg-background px-4 py-4 text-sm font-semibold text-foreground">
                      {attempt.score} / {attempt.totalPoints}
                    </td>
                    <td className="border-y-2 border-border bg-background px-4 py-4">
                      <Badge tone={resultBadge.tone}>
                        {resultBadge.label}
                      </Badge>
                    </td>
                    <td className="rounded-r-[1.25rem] border-y-2 border-r-2 border-border bg-background px-4 py-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/student/results/${attempt.attemptId}`)}
                        className="inline-flex items-center gap-2 font-body text-sm font-semibold text-accent transition-colors hover:underline"
                      >
                        View Details
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </DashboardLayout>
  );
};

export default MyResultsPage;
