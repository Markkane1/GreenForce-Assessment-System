import { Download, FileSpreadsheet, FileText, GraduationCap, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Badge from '../../components/common/Badge';
import DashboardLayout from '../../components/common/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EssayGradingCard from '../../components/grading/EssayGradingCard';
import ScoreSummary from '../../components/grading/ScoreSummary';
import * as gradingService from '../../services/gradingService';

const formatDateTime = (value) => {
  if (!value) {
    return '—';
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

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const buildPrintableReportHtml = (report) => {
  const rows = report.candidateRows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.candidateName)}</td>
          <td>${escapeHtml(row.attendanceStatus)}</td>
          <td>${row.questionsAttempted}</td>
          <td>${row.correctQuestions}</td>
          <td>${row.wrongQuestions}</td>
          <td>${row.marksObtained}</td>
          <td>${escapeHtml(row.passFailStatus)}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(report.test.title)} Report</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --background: #F5F5F4;
            --surface: #FFFFFF;
            --foreground: #1C1917;
            --muted: #E7E5E4;
            --muted-fg: #78716C;
            --accent: #1D4ED8;
            --accent-fg: #FFFFFF;
            --border: #D6D3D1;
            --success: #15803D;
            --warning: #B45309;
            --danger: #B91C1C;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 32px;
            background: var(--background);
            color: var(--foreground);
            font-family: "Inter", Arial, sans-serif;
          }
          .page {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 32px;
          }
          .eyebrow {
            text-transform: uppercase;
            letter-spacing: 0.18em;
            font-size: 12px;
            font-weight: 700;
            color: var(--muted-fg);
            text-align: center;
          }
          h1 {
            margin: 14px 0 8px;
            text-align: center;
            font-size: 34px;
            line-height: 1.1;
          }
          .meta {
            text-align: center;
            color: var(--muted-fg);
            line-height: 1.8;
            margin-bottom: 24px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 24px;
          }
          .summary-card {
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 14px 16px;
            background: #FAFAF9;
          }
          .summary-label {
            text-transform: uppercase;
            letter-spacing: 0.14em;
            font-size: 11px;
            color: var(--muted-fg);
            font-weight: 700;
          }
          .summary-value {
            margin-top: 8px;
            font-size: 22px;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            overflow: hidden;
            border: 1px solid var(--border);
            border-radius: 12px;
          }
          thead th {
            background: var(--muted);
            color: var(--muted-fg);
            text-transform: uppercase;
            letter-spacing: 0.14em;
            font-size: 11px;
            padding: 14px 12px;
            text-align: left;
          }
          tbody td {
            padding: 14px 12px;
            border-top: 1px solid var(--border);
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="eyebrow">Schedule Report</div>
          <h1>${escapeHtml(report.test.title)}</h1>
          <div class="meta">
            Conducting Officer: ${escapeHtml(report.test.conductingOfficer)}<br />
            Schedule Window: ${escapeHtml(formatDateTime(report.schedule.startTime))} — ${escapeHtml(formatDateTime(report.schedule.endTime))}<br />
            Cheating Tries Recorded: ${report.totalViolations}
          </div>
          <div class="summary">
            <div class="summary-card">
              <div class="summary-label">Assigned</div>
              <div class="summary-value">${report.candidateRows.length}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Present</div>
              <div class="summary-value">${report.candidateRows.filter((row) => row.attendanceStatus === 'Present').length}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Absent</div>
              <div class="summary-value">${report.candidateRows.filter((row) => row.attendanceStatus === 'Absent').length}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Status</div>
              <div class="summary-value">${escapeHtml(report.gradingStatus === 'ready' ? 'Ready' : 'Pending')}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Candidate Name</th>
                <th>Attendance Status</th>
                <th>Questions Attempted</th>
                <th>Correct Questions</th>
                <th>Wrong Questions</th>
                <th>Marks Obtained</th>
                <th>Pass/Fail Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </body>
    </html>
  `;
};

const exportScheduleAsExcel = (report) => {
  const tableRows = report.candidateRows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.candidateName)}</td>
          <td>${escapeHtml(row.attendanceStatus)}</td>
          <td>${row.questionsAttempted}</td>
          <td>${row.correctQuestions}</td>
          <td>${row.wrongQuestions}</td>
          <td>${row.marksObtained}</td>
          <td>${escapeHtml(row.passFailStatus)}</td>
        </tr>
      `,
    )
    .join('');

  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table>
          <tr><td colspan="7"><strong>${escapeHtml(report.test.title)}</strong></td></tr>
          <tr><td colspan="7">Conducting Officer: ${escapeHtml(report.test.conductingOfficer)}</td></tr>
          <tr><td colspan="7">Schedule Window: ${escapeHtml(formatDateTime(report.schedule.startTime))} — ${escapeHtml(formatDateTime(report.schedule.endTime))}</td></tr>
          <tr><td colspan="7">Cheating Tries Recorded: ${report.totalViolations}</td></tr>
        </table>
        <br />
        <table border="1">
          <thead>
            <tr>
              <th>Candidate Name</th>
              <th>Attendance Status</th>
              <th>Questions Attempted</th>
              <th>Correct Questions</th>
              <th>Wrong Questions</th>
              <th>Marks Obtained</th>
              <th>Pass/Fail Status</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.test.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportScheduleAsPdf = (report) => {
  const printableWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=900');

  if (!printableWindow) {
    throw new Error('Unable to open the print window. Please allow pop-ups and try again.');
  }

  printableWindow.document.open();
  printableWindow.document.write(buildPrintableReportHtml(report));
  printableWindow.document.close();
  printableWindow.focus();
  printableWindow.print();
};

const GradingPage = () => {
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [scheduleReport, setScheduleReport] = useState(null);
  const [pendingAttempts, setPendingAttempts] = useState([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState('');
  const [attemptDetail, setAttemptDetail] = useState(null);
  const [draftScores, setDraftScores] = useState({});
  const [isSchedulesLoading, setIsSchedulesLoading] = useState(true);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [isAttemptLoading, setIsAttemptLoading] = useState(false);
  const [isSavingEssayId, setIsSavingEssayId] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadAttemptDetail = useCallback(async (attemptId) => {
    if (!attemptId) {
      setAttemptDetail(null);
      setDraftScores({});
      return;
    }

    setIsAttemptLoading(true);

    try {
      const detail = await gradingService.getAttemptDetail(attemptId);
      setAttemptDetail(detail);
      setDraftScores(createDraftMap(detail.answers || []));
    } finally {
      setIsAttemptLoading(false);
    }
  }, []);

  const loadScheduleWorkspace = useCallback(async (scheduleId, preferredAttemptId = '') => {
    if (!scheduleId) {
      setScheduleReport(null);
      setPendingAttempts([]);
      setSelectedAttemptId('');
      setAttemptDetail(null);
      setDraftScores({});
      return;
    }

    setIsReportLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const [report, attempts] = await Promise.all([
        gradingService.getScheduleReport(scheduleId),
        gradingService.getAttemptsForGrading({ scheduleId, status: 'pending_essay' }),
      ]);

      setScheduleReport(report);
      setPendingAttempts(attempts);

      const nextAttemptId =
        preferredAttemptId && attempts.some((attempt) => attempt._id === preferredAttemptId)
          ? preferredAttemptId
          : attempts[0]?._id || '';

      setSelectedAttemptId(nextAttemptId);
      await loadAttemptDetail(nextAttemptId);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load schedule grading data.');
    } finally {
      setIsReportLoading(false);
    }
  }, [loadAttemptDetail]);

  const loadSchedules = useCallback(async () => {
    setIsSchedulesLoading(true);
    setErrorMessage('');

    try {
      const concludedSchedules = await gradingService.getConcludedSchedules();
      setSchedules(concludedSchedules);

      const firstScheduleId = concludedSchedules[0]?._id || '';
      setSelectedScheduleId(firstScheduleId);
      await loadScheduleWorkspace(firstScheduleId);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load concluded schedules.');
    } finally {
      setIsSchedulesLoading(false);
    }
  }, [loadScheduleWorkspace]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleSelectSchedule = async (scheduleId) => {
    setSelectedScheduleId(scheduleId);
    await loadScheduleWorkspace(scheduleId);
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
      setStatusMessage('Essay grade saved.');
      await loadScheduleWorkspace(selectedScheduleId, selectedAttemptId);
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
      setStatusMessage('Attempt finalized.');
      await loadScheduleWorkspace(selectedScheduleId);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to finalize attempt.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const essayAnswers = useMemo(
    () => (attemptDetail?.answers || []).filter((answer) => answer.questionId?.type === 'essay'),
    [attemptDetail],
  );

  const mcqSummary = useMemo(() => {
    const answers = attemptDetail?.answers || [];
    const mcqAnswers = answers.filter((answer) => answer.questionId?.type === 'mcq');

    return {
      attempted: mcqAnswers.filter((answer) => answer.selectedOptionId).length,
      correct: mcqAnswers.filter((answer) => (answer.score || 0) > 0).length,
      wrong: mcqAnswers.filter((answer) => answer.selectedOptionId && (answer.score || 0) === 0).length,
    };
  }, [attemptDetail]);

  const allEssaysGraded = essayAnswers.every((answer) => answer.gradingStatus === 'graded');

  return (
    <DashboardLayout title="Grading">
      <section className="editorial-page-header">
        <div>
          <div className="editorial-section-label">
            <span>Grading</span>
          </div>
          <h2 className="editorial-page-title">Concluded Schedules</h2>
          <p className="editorial-page-copy">
            Review finished schedules, grade pending essays, and export complete result reports.
          </p>
        </div>
      </section>

      {errorMessage ? (
        <div className="mt-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
          {errorMessage}
        </div>
      ) : null}

      {statusMessage ? (
        <div className="mt-4 rounded-full border-2 border-quaternary bg-quaternary/20 px-4 py-2 text-sm font-medium text-foreground">
          {statusMessage}
        </div>
      ) : null}

      <section className="mt-8 grid gap-8 xl:grid-cols-[360px,1fr]">
        <aside className="editorial-panel p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-accentSubtle shadow-card">
              <GraduationCap size={20} strokeWidth={2.5} className="text-accent" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-foreground">Schedule Queue</h3>
              <p className="text-sm text-mutedFg">Every completed schedule appears here.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {isSchedulesLoading ? <LoadingSpinner /> : null}
            {!isSchedulesLoading && schedules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-surfaceAlt p-6 text-center text-sm text-mutedFg">
                No concluded schedules are ready yet.
              </div>
            ) : null}
            {!isSchedulesLoading &&
              schedules.map((schedule) => (
                <button
                  key={schedule._id}
                  type="button"
                  onClick={() => handleSelectSchedule(schedule._id)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedScheduleId === schedule._id
                      ? 'border-accent bg-accentSubtle'
                      : 'border-border bg-surface hover:bg-surfaceAlt'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{schedule.testTitle}</p>
                      <p className="mt-1 text-sm text-mutedFg">
                        {formatDateTime(schedule.startTime)} — {formatDateTime(schedule.endTime)}
                      </p>
                    </div>
                    <Badge tone={schedule.gradingStatus === 'ready' ? 'quaternary' : 'tertiary'}>
                      {schedule.gradingStatus === 'ready' ? 'Ready' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-mutedFg">
                    <span>{schedule.attendanceCount} present</span>
                    <span>•</span>
                    <span>{schedule.absentCount} absent</span>
                    <span>•</span>
                    <span>{schedule.totalViolations} cheating tries</span>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                    {schedule.gradingStatus === 'ready' ? 'Open Report' : 'Review Grading'}
                  </div>
                </button>
              ))}
          </div>
        </aside>

        <section className="space-y-6">
          <div className="editorial-panel p-6">
            {isReportLoading ? <LoadingSpinner /> : null}

            {!isReportLoading && !scheduleReport ? (
              <div className="flex min-h-[320px] items-center justify-center text-center text-mutedFg">
                Select a concluded schedule to review grading and export results.
              </div>
            ) : null}

            {!isReportLoading && scheduleReport ? (
              <div>
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="editorial-section-label">
                      <span>Schedule Report</span>
                    </div>
                    <h3 className="mt-3 text-3xl font-semibold text-foreground">{scheduleReport.test.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-mutedFg">
                      Conducting Officer: {scheduleReport.test.conductingOfficer}
                      <br />
                      Schedule Window: {formatDateTime(scheduleReport.schedule.startTime)} — {formatDateTime(scheduleReport.schedule.endTime)}
                      <br />
                      Assigned Groups: {scheduleReport.schedule.assignedGroups.map((group) => group.name).join(', ')}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => exportScheduleAsExcel(scheduleReport)}
                      disabled={scheduleReport.gradingStatus !== 'ready'}
                      className="editorial-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FileSpreadsheet size={18} strokeWidth={2.5} />
                      Export Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => exportScheduleAsPdf(scheduleReport)}
                      disabled={scheduleReport.gradingStatus !== 'ready'}
                      className="editorial-button-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FileText size={18} strokeWidth={2.5} />
                      Export PDF
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  {[
                    { label: 'Assigned', value: scheduleReport.candidateRows.length, icon: GraduationCap },
                    {
                      label: 'Present',
                      value: scheduleReport.candidateRows.filter((row) => row.attendanceStatus === 'Present').length,
                      icon: Download,
                    },
                    {
                      label: 'Absent',
                      value: scheduleReport.candidateRows.filter((row) => row.attendanceStatus === 'Absent').length,
                      icon: ShieldAlert,
                    },
                    { label: 'Cheating Tries', value: scheduleReport.totalViolations, icon: ShieldAlert },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.label} className="rounded-lg border border-border bg-surfaceAlt p-4 shadow-card">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-mutedFg">
                            {item.label}
                          </span>
                          <Icon size={16} strokeWidth={2.5} className="text-accent" />
                        </div>
                        <p className="mt-4 text-2xl font-semibold text-foreground">{item.value}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="editorial-table">
                    <thead>
                      <tr>
                        {[
                          'Candidate Name',
                          'Attendance Status',
                          'Questions Attempted',
                          'Correct Questions',
                          'Wrong Questions',
                          'Marks Obtained',
                          'Pass/Fail Status',
                        ].map((heading) => (
                          <th key={heading}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleReport.candidateRows.map((row) => (
                        <tr key={row.candidateId}>
                          <td className="rounded-l-[1.25rem] border-y-2 border-l-2 border-border bg-background px-4 py-4">
                            <div>
                              <p className="font-semibold text-foreground">{row.candidateName}</p>
                              <p className="text-sm text-mutedFg">{row.candidateEmail}</p>
                            </div>
                          </td>
                          <td className="border-y-2 border-border bg-background px-4 py-4">
                            <Badge tone={row.attendanceStatus === 'Present' ? 'quaternary' : 'secondary'}>
                              {row.attendanceStatus}
                            </Badge>
                          </td>
                          <td className="border-y-2 border-border bg-background px-4 py-4 font-semibold text-foreground">
                            {row.questionsAttempted}
                          </td>
                          <td className="border-y-2 border-border bg-background px-4 py-4 font-semibold text-foreground">
                            {row.correctQuestions}
                          </td>
                          <td className="border-y-2 border-border bg-background px-4 py-4 font-semibold text-foreground">
                            {row.wrongQuestions}
                          </td>
                          <td className="border-y-2 border-border bg-background px-4 py-4 font-semibold text-foreground">
                            {row.marksObtained}
                          </td>
                          <td className="rounded-r-[1.25rem] border-y-2 border-r-2 border-border bg-background px-4 py-4">
                            <Badge
                              tone={
                                row.passFailStatus === 'Pass'
                                  ? 'quaternary'
                                  : row.passFailStatus === 'Pending'
                                    ? 'tertiary'
                                    : 'secondary'
                              }
                            >
                              {row.passFailStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          {scheduleReport?.gradingStatus === 'pending_essay' ? (
            <div className="editorial-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="editorial-section-label">
                    <span>Pending Grading</span>
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold text-foreground">Essay Attempts</h3>
                  <p className="mt-2 text-sm text-mutedFg">
                    Select a pending attempt, grade essays, then finalize it before exporting the full schedule report.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[320px,1fr]">
                <div className="space-y-3">
                  {pendingAttempts.map((attempt) => (
                    <button
                      key={attempt._id}
                      type="button"
                      onClick={async () => {
                        setSelectedAttemptId(attempt._id);
                        await loadAttemptDetail(attempt._id);
                      }}
                      className={`w-full rounded-lg border p-4 text-left transition-colors ${
                        selectedAttemptId === attempt._id
                          ? 'border-accent bg-accentSubtle'
                          : 'border-border bg-surface hover:bg-surfaceAlt'
                      }`}
                    >
                      <p className="font-semibold text-foreground">{attempt.studentId?.name}</p>
                      <p className="mt-1 text-sm text-mutedFg">Submitted {formatDateTime(attempt.submittedAt)}</p>
                    </button>
                  ))}
                </div>

                <div>
                  {isAttemptLoading ? <LoadingSpinner /> : null}
                  {!isAttemptLoading && !attemptDetail ? (
                    <div className="rounded-lg border border-dashed border-border bg-surfaceAlt p-8 text-center text-sm text-mutedFg">
                      Select a pending attempt to grade essays.
                    </div>
                  ) : null}

                  {!isAttemptLoading && attemptDetail ? (
                    <div className="space-y-6">
                      <div className="grid gap-5 lg:grid-cols-[1fr,280px]">
                        <div className="rounded-lg border border-border bg-surfaceAlt p-5 shadow-card">
                          <h4 className="text-xl font-semibold text-foreground">
                            {attemptDetail.studentId?.name} — {attemptDetail.testId?.title}
                          </h4>
                          <p className="mt-2 text-sm text-mutedFg">
                            Submitted {formatDateTime(attemptDetail.submittedAt)}
                          </p>
                          <div className="mt-5 grid gap-4 sm:grid-cols-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mutedFg">MCQ Attempted</p>
                              <p className="mt-2 text-2xl font-semibold text-foreground">{mcqSummary.attempted}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mutedFg">Correct</p>
                              <p className="mt-2 text-2xl font-semibold text-foreground">{mcqSummary.correct}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mutedFg">Wrong</p>
                              <p className="mt-2 text-2xl font-semibold text-foreground">{mcqSummary.wrong}</p>
                            </div>
                          </div>
                        </div>
                        <ScoreSummary
                          score={attemptDetail.score || 0}
                          passingScore={attemptDetail.testId?.passingScore || 0}
                          passed={attemptDetail.passed}
                        />
                      </div>

                      <div className="space-y-5">
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

                      <button
                        type="button"
                        onClick={handleFinalize}
                        disabled={!allEssaysGraded || isFinalizing}
                        className="editorial-button-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isFinalizing ? 'Finalizing...' : 'Finalize Attempt'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </DashboardLayout>
  );
};

export default GradingPage;
