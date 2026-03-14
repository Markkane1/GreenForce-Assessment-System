import { CalendarClock, PartyPopper, PlusCircle, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import DashboardLayout from '../../components/common/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../hooks/useAuth';
import { getAttemptsForGrading } from '../../services/gradingService';
import { getSchedules } from '../../services/scheduleService';
import { deleteTest, getTests } from '../../services/testService';

const statsConfig = [
  { key: 'myTests', label: 'Tests', tone: 'bg-accent', icon: PartyPopper },
  { key: 'scheduledExams', label: 'Scheduled Exams', tone: 'bg-secondary', icon: Sparkles },
  { key: 'pendingGradings', label: 'Pending Gradings', tone: 'bg-quaternary', icon: Wand2 },
];

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ myTests: 0, scheduledExams: 0, pendingGradings: 0 });
  const [recentTests, setRecentTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTest, setSelectedTest] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [tests, schedules, pendingGradings] = await Promise.all([
          getTests(),
          getSchedules(),
          getAttemptsForGrading({ status: 'pending_essay' }),
        ]);

        setStats({
          myTests: tests.length,
          scheduledExams: schedules.length,
          pendingGradings: pendingGradings.length,
        });
        setRecentTests(tests.slice(0, 5));
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load teacher dashboard.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const handleDeleteTest = async () => {
    if (!selectedTest) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage('');

    try {
      await deleteTest(selectedTest._id);
      setRecentTests((current) => current.filter((test) => test._id !== selectedTest._id));
      setStats((current) => ({
        ...current,
        myTests: Math.max(current.myTests - 1, 0),
      }));
      setSelectedTest(null);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete test.');
    } finally {
      setIsDeleting(false);
    }
  };

  const statusBadge = useMemo(
    () => ({
      draft: { tone: 'tertiary', label: 'Draft' },
      published: { tone: 'quaternary', label: 'Published' },
    }),
    [],
  );

  return (
    <DashboardLayout title="Teacher Dashboard">
      <section className="editorial-page-header">
        <div>
          <div className="editorial-section-label">
            <span>Teaching</span>
          </div>
          <h2 className="editorial-page-title">Overview for {user?.name || 'Teacher'}</h2>
          <p className="editorial-page-copy">
            Manage tests, live schedules, and grading activity from a single editorial workspace.
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-3">
        {statsConfig.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.key} className="relative mt-5 rounded-2xl border border-border bg-card p-6 shadow-editorialMd">
              <div className={`absolute -top-5 left-6 flex h-14 w-14 items-center justify-center rounded-full border border-border ${card.tone} shadow-editorialSm`}>
                <Icon size={22} className="text-foreground" />
              </div>
              <p className="mt-8 font-editorialMono text-xs font-medium uppercase tracking-[0.15em] text-mutedFg">{card.label}</p>
              {isLoading ? <LoadingSpinner /> : <p className="mt-4 font-heading text-4xl font-semibold text-foreground">{stats[card.key]}</p>}
            </div>
          );
        })}
      </section>

      <section className="mt-8 flex flex-col gap-4 md:flex-row">
        <button
          type="button"
          onClick={() => navigate('/teacher/tests/new')}
          className="editorial-button-secondary flex-1"
        >
          <PlusCircle size={18} />
          Create New Test
        </button>
        <button
          type="button"
          onClick={() => navigate('/teacher/schedule?create=1')}
          className="editorial-button-secondary flex-1"
        >
          <CalendarClock size={18} />
          Schedule an Exam
        </button>
      </section>

      <section className="mt-8 editorial-panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-3xl font-semibold text-foreground">Recent Tests</h3>
            <p className="mt-1 text-sm text-mutedFg">Latest drafts and published assessments available to your role.</p>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-secondary bg-secondary/15 px-4 py-3 font-body text-sm font-medium text-foreground">
            {errorMessage}
          </div>
        ) : null}

        {!isLoading && recentTests.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="editorial-table">
              <thead>
                <tr>
                  {['Title', 'Status', 'Question Count', 'Actions'].map((heading) => (
                    <th key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTests.map((test) => {
                  const status = test.isPublished ? statusBadge.published : statusBadge.draft;

                  return (
                    <tr key={test._id}>
                      <td className="rounded-l-2xl border border-border bg-background px-4 py-4 font-semibold text-foreground">
                        {test.title}
                      </td>
                      <td className="border-y border-border bg-background px-4 py-4">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                      <td className="border-y border-border bg-background px-4 py-4 text-mutedFg">{test.questionCount}</td>
                      <td className="rounded-r-2xl border border-border bg-background px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/teacher/tests/${test._id}`)}
                            className="editorial-button-secondary"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/teacher/schedule?create=1')}
                            className="editorial-pill-button"
                          >
                            Schedule
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTest(test)}
                            className="editorial-button-primary"
                          >
                            <Trash2 size={16} strokeWidth={2.5} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {!isLoading && recentTests.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-background p-8 text-center text-mutedFg">
            No tests yet. Create your first one to get started.
          </div>
        ) : null}
      </section>
      <Modal isOpen={Boolean(selectedTest)} onClose={() => setSelectedTest(null)} title="Delete Test?">
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-accent bg-accent/10 p-4 font-body text-sm leading-7 text-foreground">
            Deleting <strong>{selectedTest?.title}</strong> removes its sections and questions. This cannot be undone.
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setSelectedTest(null)}
              className="editorial-button-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteTest}
              disabled={isDeleting}
              className="editorial-button-primary flex-1 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDeleting ? 'Deleting...' : 'Delete Test'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
