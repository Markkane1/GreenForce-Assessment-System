import { ArrowRight, BookOpen, Clock3, History } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import DashboardLayout from '../../components/common/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import { getMyAttempts } from '../../services/examService';
import { getSchedules } from '../../services/scheduleService';

const getScheduleStatus = (schedule) => {
  const now = Date.now();
  const start = new Date(schedule.startTime).getTime();
  const end = new Date(schedule.endTime).getTime();
  const attemptsTaken = schedule.attemptsTaken || 0;
  const maxAttempts = schedule.testId?.maxAttempts || 0;

  if (maxAttempts > 0 && attemptsTaken >= maxAttempts) {
    return { label: 'Attempts Exhausted', tone: 'secondary', canStart: false };
  }

  if (now > end) {
    return { label: 'Ended', tone: 'muted', canStart: false };
  }

  if (now < start) {
    return { label: 'Starting Soon', tone: 'tertiary', canStart: false };
  }

  return { label: 'Available Now', tone: 'quaternary', canStart: true };
};

const formatSubmittedDate = (submittedAt) => {
  if (!submittedAt) {
    return 'Submission time unavailable';
  }

  return new Date(submittedAt).toLocaleString();
};

const getAttemptBadge = (attempt) => {
  if (attempt.resultStatus === 'pending' || attempt.pendingEssayCount > 0) {
    return {
      tone: 'tertiary',
      label: 'Pending',
      scoreTone: 'border-tertiary bg-tertiary/20 text-foreground',
    };
  }

  if (attempt.passed) {
    return {
      tone: 'quaternary',
      label: 'Passed',
      scoreTone: 'border-quaternary bg-quaternary/20 text-foreground',
    };
  }

  return {
    tone: 'secondary',
    label: 'Failed',
    scoreTone: 'border-secondary bg-secondary/20 text-foreground',
  };
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAttemptsLoading, setIsAttemptsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [attemptsError, setAttemptsError] = useState('');

  useEffect(() => {
    const loadSchedules = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const assignedSchedules = await getSchedules();
        setSchedules(assignedSchedules);
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load your student dashboard.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSchedules();
  }, []);

  useEffect(() => {
    const loadAttempts = async () => {
      setIsAttemptsLoading(true);
      setAttemptsError('');

      try {
        const pastAttempts = await getMyAttempts();
        setAttempts(pastAttempts);
      } catch (error) {
        setAttemptsError(error.message || 'Unable to load past exam attempts.');
      } finally {
        setIsAttemptsLoading(false);
      }
    };

    loadAttempts();
  }, []);

  const greetingName = useMemo(() => user?.name?.split(' ')[0] || 'Student', [user?.name]);
  const visibleSchedules = useMemo(() => {
    const statusWeight = (schedule) => {
      const status = getScheduleStatus(schedule);

      if (status.label === 'Available Now') {
        return 0;
      }

      if (status.label === 'Starting Soon') {
        return 1;
      }

      if (status.label === 'Attempts Exhausted') {
        return 2;
      }

      return 3;
    };

    return [...schedules].sort((first, second) => {
      const weightDifference = statusWeight(first) - statusWeight(second);

      if (weightDifference !== 0) {
        return weightDifference;
      }

      return new Date(first.startTime).getTime() - new Date(second.startTime).getTime();
    });
  }, [schedules]);

  return (
    <DashboardLayout title="Student Dashboard">
      <section className="editorial-page-header">
        <div>
          <div className="editorial-section-label">
            <span>Student</span>
          </div>
          <h2 className="editorial-page-title">Overview for {greetingName}</h2>
          <p className="editorial-page-copy">
            Review the exams assigned to your groups and reopen prior results when needed.
          </p>
        </div>
      </section>

      {errorMessage ? (
        <div className="mt-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8">
        {isLoading ? <LoadingSpinner /> : null}
        {!isLoading && schedules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-editorialMd">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-border bg-muted shadow-editorialSm">
              <BookOpen size={28} strokeWidth={2.2} className="text-accent" />
            </div>
            <h3 className="mt-6 font-heading text-2xl font-semibold text-foreground">No exams scheduled for you yet</h3>
            <p className="mt-2 font-body text-mutedFg">Check back later after your teacher publishes and schedules a test.</p>
          </div>
        ) : null}

        {!isLoading && visibleSchedules.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {visibleSchedules.map((schedule) => {
              const status = getScheduleStatus(schedule);

              return (
                <article key={schedule._id} className="relative mt-5 rounded-2xl border border-border bg-card p-6 shadow-editorialMd">
                  <div className="absolute -top-5 left-6 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-accent shadow-editorialSm">
                    <BookOpen size={22} className="text-accentFg" />
                  </div>
                  <div className="mt-8 flex items-start justify-between gap-4">
                    <h3 className="font-heading text-2xl font-bold text-foreground">{schedule.testId?.title}</h3>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-border bg-background p-4">
                    <Clock3 size={18} strokeWidth={2.5} className="mt-1 text-foreground" />
                    <p className="text-sm leading-6 text-mutedFg">
                      {new Date(schedule.startTime).toLocaleString()} - {new Date(schedule.endTime).toLocaleString()}
                    </p>
                  </div>
                  {typeof schedule.attemptsTaken === 'number' ? (
                    <p className="mt-4 text-xs uppercase tracking-[0.12em] text-mutedFg">
                      Attempts used: {schedule.attemptsTaken} / {schedule.testId?.maxAttempts || 0}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={!status.canStart}
                    onClick={() => navigate(`/student/exam/${schedule._id}`)}
                    className={`mt-6 w-full rounded-md border px-5 py-3 font-body text-sm font-semibold transition-all duration-200 ease-out ${
                      status.canStart
                        ? 'border-accent bg-accent text-accentFg shadow-editorialMd hover:-translate-y-0.5'
                        : 'border-border bg-muted text-mutedFg'
                    }`}
                  >
                    {status.label === 'Attempts Exhausted' ? 'Attempts Used' : 'Start Exam'}
                  </button>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="mt-12">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary/15 shadow-editorialSm">
            <History size={20} strokeWidth={2.2} className="text-secondary" />
          </div>
          <div>
            <h3 className="font-heading text-3xl font-bold text-foreground">Past Exams</h3>
            <p className="text-sm text-mutedFg">Review previously submitted exams and reopen their result details.</p>
          </div>
        </div>

        {attemptsError && !errorMessage ? (
          <div className="mt-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
            {attemptsError}
          </div>
        ) : null}

        {isAttemptsLoading ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`attempt-skeleton-${index}`}
                className="h-28 rounded-[1.5rem] border-2 border-border bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : null}

        {!isAttemptsLoading && attempts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-8 text-center shadow-editorialMd">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted shadow-editorialSm">
              <BookOpen size={24} strokeWidth={2.5} className="text-foreground" />
            </div>
            <h4 className="mt-5 font-heading text-2xl font-extrabold text-foreground">No completed exams yet</h4>
            <p className="mt-2 text-mutedFg">Your submitted exams will appear here once results are available.</p>
          </div>
        ) : null}

        {!isAttemptsLoading && attempts.length > 0 ? (
          <div className="mt-6 space-y-4">
            {attempts.map((attempt) => {
              const attemptBadge = getAttemptBadge(attempt);

              return (
                <article
                  key={attempt.attemptId}
                  className="rounded-2xl border border-border bg-card p-5 shadow-editorialMd"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h4 className="font-heading text-2xl font-bold text-foreground">{attempt.testTitle}</h4>
                      <p className="mt-2 text-sm text-mutedFg">
                        Submitted on {formatSubmittedDate(attempt.submittedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className={`rounded-full border px-4 py-2 text-sm font-bold ${attemptBadge.scoreTone}`}>
                        {attempt.score} / {attempt.totalPoints}
                      </div>
                      <Badge tone={attemptBadge.tone}>
                        {attemptBadge.label}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => navigate(`/student/results/${attempt.attemptId}`)}
                        className="inline-flex items-center gap-2 font-body text-sm font-semibold text-accent transition-colors hover:underline"
                      >
                        View Details
                        <ArrowRight size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </DashboardLayout>
  );
};

export default StudentDashboard;
