import { Activity, ClipboardList, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/common/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { getUsers } from '../../services/userService';

const DotGrid = () => (
  <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden="true">
    <defs>
      <pattern id="admin-dot-grid" width="26" height="26" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="2.5" fill="#1F2937" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#admin-dot-grid)" />
  </svg>
);

const statCards = [
  { key: 'totalUsers', label: 'Total Users', tone: 'bg-accent', icon: Users },
  { key: 'totalTests', label: 'Total Tests', tone: 'bg-secondary', icon: ClipboardList },
  { key: 'activeExams', label: 'Active Exams', tone: 'bg-quaternary', icon: Activity },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalUsers: 0, totalTests: 0, activeExams: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [users, testsResponse] = await Promise.all([getUsers(), api.get('/tests')]);
        const tests = testsResponse.data.tests || [];
        setStats({
          totalUsers: users.length,
          totalTests: tests.length,
          activeExams: tests.filter((test) => test.isPublished).length,
        });
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load dashboard stats.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const greetingName = useMemo(() => user?.name?.split(' ')[0] || 'Admin', [user?.name]);

  return (
    <DashboardLayout title="Admin Dashboard">
      <section>
        <h2 className="font-heading text-4xl font-extrabold text-foreground">
          Hello, {greetingName} {String.fromCodePoint(0x1f44b)}
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-mutedFg">
          Here&apos;s a playful snapshot of what&apos;s happening across your exam platform today.
        </p>
      </section>

      <section className="relative mt-10 overflow-hidden rounded-[2rem] border-2 border-border bg-card p-6 shadow-pop-soft">
        <DotGrid />
        <div className="relative z-10">
          {isLoading ? <LoadingSpinner /> : null}
          {errorMessage ? (
            <div className="rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
              {errorMessage}
            </div>
          ) : null}
          {!isLoading ? (
            <div className="grid gap-8 lg:grid-cols-3">
              {statCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div key={card.key} className="relative mt-5 rounded-[1.75rem] border-2 border-foreground bg-background p-6 shadow-pop">
                    <div className={`absolute -top-5 left-6 flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground ${card.tone} shadow-pop-press`}>
                      <Icon size={22} className="text-foreground" />
                    </div>
                    <p className="mt-8 text-sm font-bold uppercase tracking-[0.22em] text-mutedFg">{card.label}</p>
                    <p className="mt-4 font-heading text-3xl font-extrabold text-foreground">{stats[card.key]}</p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>
    </DashboardLayout>
  );
};

export default AdminDashboard;
