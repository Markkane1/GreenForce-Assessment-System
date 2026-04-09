import { Calendar, Clock3, Flag, Monitor as MonitorIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../../components/common/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import api from '../../services/api';
import { getActiveAttempts as getActiveAttemptsService } from '../../services/scheduleService';

const formatClock = (seconds = 0) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

const badgeToneClasses = {
  fullscreen_exit: 'border-secondary bg-secondary/20 text-secondary',
  tab_switch: 'border-foreground bg-tertiary/20 text-foreground',
  copy_attempt: 'border-foreground bg-accent/20 text-foreground',
  window_blur: 'border-border bg-muted text-mutedFg',
};

const MonitorPage = () => {
  const { id } = useParams();
  const [schedule, setSchedule] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [violationThreshold, setViolationThreshold] = useState(5);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [logsError, setLogsError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadMonitor = async ({ silent = false } = {}) => {
      if (!silent) {
        setIsLoading(true);
      }

      try {
        const activeAttemptData = await getActiveAttemptsService(id);

        if (!isMounted) {
          return;
        }

        setSchedule(activeAttemptData.schedule || null);
        setAttempts(activeAttemptData.attempts || []);
        setViolationThreshold(activeAttemptData.violationThreshold || 5);
        setLastUpdated(new Date());
        setErrorMessage('');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error.message || 'Unable to load exam monitor.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadMonitor();

    const intervalId = window.setInterval(() => {
      loadMonitor({ silent: true });
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [id]);

  const openLogsModal = async (attempt) => {
    setSelectedAttempt(attempt);
    setLogs([]);
    setLogsError('');
    setIsLogsLoading(true);

    try {
      const { data } = await api.get(`/proctor/${attempt.attemptId}/logs`);
      setLogs(data.logs || []);
    } catch (error) {
      setLogsError(error.response?.data?.message || 'Unable to load proctor logs.');
    } finally {
      setIsLogsLoading(false);
    }
  };

  const closeLogsModal = () => {
    setSelectedAttempt(null);
    setLogs([]);
    setLogsError('');
  };

  const formatMetadata = (metadata) => {
    if (!metadata || Object.keys(metadata).length === 0) {
      return 'No metadata';
    }

    return JSON.stringify(metadata);
  };

  const studentCountLabel = useMemo(() => `${attempts.length} students in exam`, [attempts.length]);

  return (
    <DashboardLayout title="Live Monitor">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-heading text-4xl font-extrabold text-foreground">
            {schedule?.testId?.title || 'Exam Monitor'}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2 text-sm text-mutedFg shadow-pop-soft">
              <Calendar size={16} strokeWidth={2.5} className="text-foreground" />
              <span>
                Active: {schedule?.startTime ? new Date(schedule.startTime).toLocaleString() : '--'} -{' '}
                {schedule?.endTime ? new Date(schedule.endTime).toLocaleString() : '--'}
              </span>
            </div>
            <div className="inline-flex rounded-full border-2 border-foreground bg-accent px-3 py-1 text-sm font-bold text-accentFg shadow-pop-press">
              {studentCountLabel}
            </div>
          </div>
        </div>

        <div className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs text-foreground shadow-pop-soft">
          Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Loading...'}
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
          <div className="flex flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-border bg-background px-8 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-foreground bg-muted shadow-pop-press">
              <Clock3 size={26} strokeWidth={2.5} className="text-foreground" />
            </div>
            <h3 className="mt-5 font-heading text-2xl font-extrabold text-foreground">
              No students are currently taking this exam
            </h3>
          </div>
        ) : null}

        {!isLoading && attempts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="editorial-table">
              <thead>
                <tr>
                  {['Student', 'Progress', 'Time Elapsed', 'Violations', 'Actions'].map((heading) => (
                    <th key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => {
                  const progressPercentage =
                    attempt.totalQuestions > 0 ? Math.min((attempt.answeredCount / attempt.totalQuestions) * 100, 100) : 0;
                  const violationClasses =
                    attempt.violationsCount >= violationThreshold
                      ? 'bg-secondary/20 text-secondary font-bold'
                      : attempt.violationsCount >= 1
                        ? 'bg-tertiary/20 text-foreground'
                        : 'bg-quaternary/20 text-quaternary';

                  return (
                    <tr key={attempt.attemptId}>
                      <td className="rounded-l-[1.25rem] border-y-2 border-l-2 border-border bg-background px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground bg-tertiary font-heading text-lg font-extrabold text-foreground shadow-pop-press">
                            {attempt.studentName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{attempt.studentName}</p>
                            <p className="text-sm text-mutedFg">{attempt.studentEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="border-y-2 border-border bg-background px-4 py-4">
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${progressPercentage}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-mutedFg">
                          {attempt.answeredCount} / {attempt.totalQuestions} answered
                        </p>
                      </td>
                      <td className="border-y-2 border-border bg-background px-4 py-4">
                        <div className="inline-flex rounded-full border-2 border-border bg-muted px-2 py-1 text-xs font-heading font-bold text-foreground">
                          {formatClock(attempt.elapsedSeconds)}
                        </div>
                      </td>
                      <td className="border-y-2 border-border bg-background px-4 py-4">
                        <div className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs ${violationClasses}`}>
                          <Flag size={14} strokeWidth={2.5} />
                          {attempt.violationsCount}
                        </div>
                      </td>
                      <td className="rounded-r-[1.25rem] border-y-2 border-r-2 border-border bg-background px-4 py-4">
                        <button
                          type="button"
                          onClick={() => openLogsModal(attempt)}
                          className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-secondary px-3 py-1 text-sm font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover"
                        >
                          <MonitorIcon size={16} strokeWidth={2.5} />
                          View Logs
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

      <Modal isOpen={Boolean(selectedAttempt)} onClose={closeLogsModal} title="Proctor Logs">
        {selectedAttempt ? (
          <div className="space-y-4">
            <div className="rounded-[1.25rem] border-2 border-border bg-background p-4">
              <p className="font-heading text-lg font-bold text-foreground">{selectedAttempt.studentName}</p>
              <p className="mt-1 text-sm text-mutedFg">{selectedAttempt.studentEmail}</p>
            </div>

            {logsError ? (
              <div className="rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
                {logsError}
              </div>
            ) : null}

            {isLogsLoading ? <LoadingSpinner /> : null}

            {!isLogsLoading && logs.length === 0 ? (
              <div className="rounded-[1.25rem] border-2 border-dashed border-border bg-background p-6 text-center text-sm text-mutedFg">
                No proctor events recorded for this attempt.
              </div>
            ) : null}

            {!isLogsLoading && logs.length > 0 ? (
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div key={log._id} className="rounded-[1.25rem] border-2 border-border bg-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span
                        className={`inline-flex rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${badgeToneClasses[log.eventType] || badgeToneClasses.window_blur}`}
                      >
                        {log.eventType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-mutedFg">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="mt-3 text-sm text-foreground">{formatMetadata(log.metadata)}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
};

export default MonitorPage;
