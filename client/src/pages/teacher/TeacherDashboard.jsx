import { CalendarClock, ClipboardCheck, PartyPopper, PlusCircle, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import DashboardLayout from '../../components/common/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import { getAttemptsForGrading } from '../../services/gradingService';
import { getSchedules } from '../../services/scheduleService';
import { getTests, getTestWorkspace } from '../../services/testService';

const statsConfig = [
  { key: 'myTests', label: 'My Tests', tone: 'bg-accent', icon: PartyPopper },
  { key: 'scheduledExams', label: 'Scheduled Exams', tone: 'bg-secondary', icon: Sparkles },
  { key: 'pendingGradings', label: 'Pending Gradings', tone: 'bg-quaternary', icon: Wand2 },
];

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ myTests: 0, scheduledExams: 0, pendingGradings: 0 });
  const [recentTests, setRecentTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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

        const detailedTests = await Promise.all(
          tests.slice(0, 5).map(async (test) => {
            const workspace = await getTestWorkspace(test._id);
            const questionCount = workspace.sections.reduce(
              (total, section) => total + (section.questions?.length || 0),
              0,
            );

            return {
              ...test,
              questionCount,
            };
          }),
        );

        setStats({
          myTests: tests.length,
          scheduledExams: schedules.length,
          pendingGradings: pendingGradings.length,
        });
        setRecentTests(detailedTests);
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load teacher dashboard.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const statusBadge = useMemo(
    () => ({
      draft: { tone: 'tertiary', label: 'Draft' },
      published: { tone: 'quaternary', label: 'Published' },
    }),
    [],
  );

  return (
    <DashboardLayout title="Teacher Dashboard">
      <section>
        <h2 className="font-heading text-4xl font-extrabold text-foreground">
          Hello, {user?.name || 'Teacher'} {String.fromCodePoint(0x1f44b)}
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-mutedFg">
          Manage your tests, upcoming schedules, and grading queue from one playful command center.
        </p>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-3">
        {statsConfig.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.key} className="relative mt-5 rounded-[1.75rem] border-2 border-foreground bg-card p-6 shadow-pop">
              <div className={`absolute -top-5 left-6 flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground ${card.tone} shadow-pop-press`}>
                <Icon size={22} className="text-foreground" />
              </div>
              <p className="mt-8 text-sm font-bold uppercase tracking-[0.22em] text-mutedFg">{card.label}</p>
              {isLoading ? <LoadingSpinner /> : <p className="mt-4 font-heading text-3xl font-extrabold text-foreground">{stats[card.key]}</p>}
            </div>
          );
        })}
      </section>

      <section className="mt-8 flex flex-col gap-4 md:flex-row">
        <button
          type="button"
          onClick={() => navigate('/teacher/tests/new')}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-foreground bg-secondary px-6 py-3 font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
        >
          <PlusCircle size={18} />
          Create New Test
        </button>
        <button
          type="button"
          onClick={() => navigate('/teacher/schedule?create=1')}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-foreground bg-secondary px-6 py-3 font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
        >
          <CalendarClock size={18} />
          Schedule an Exam
        </button>
      </section>

      <section className="mt-8 rounded-[2rem] border-2 border-border bg-card p-6 shadow-pop-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-2xl font-extrabold text-foreground">Recent Tests</h3>
            <p className="mt-1 text-sm text-mutedFg">Your latest drafts and published assessments.</p>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
            {errorMessage}
          </div>
        ) : null}

        {!isLoading && recentTests.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr>
                  {['Title', 'Status', 'Question Count', 'Actions'].map((heading) => (
                    <th key={heading} className="px-4 text-left text-xs font-bold uppercase tracking-[0.22em] text-mutedFg">
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
                      <td className="rounded-l-[1.25rem] border-y-2 border-l-2 border-border bg-background px-4 py-4 font-bold text-foreground">
                        {test.title}
                      </td>
                      <td className="border-y-2 border-border bg-background px-4 py-4">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                      <td className="border-y-2 border-border bg-background px-4 py-4 text-mutedFg">{test.questionCount}</td>
                      <td className="rounded-r-[1.25rem] border-y-2 border-r-2 border-border bg-background px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/teacher/tests/${test._id}`)}
                            className="rounded-full border-2 border-foreground bg-secondary px-4 py-2 text-sm font-bold text-foreground shadow-pop-press"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/teacher/schedule?create=1')}
                            className="rounded-full border-2 border-foreground bg-quaternary px-4 py-2 text-sm font-bold text-foreground shadow-pop-press"
                          >
                            Schedule
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
          <div className="mt-6 rounded-[1.5rem] border-2 border-dashed border-border bg-background p-8 text-center text-mutedFg">
            No tests yet. Create your first one to get started.
          </div>
        ) : null}
      </section>
    </DashboardLayout>
  );
};

export default TeacherDashboard;




