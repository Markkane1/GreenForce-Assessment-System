import { CalendarPlus, Monitor, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import DashboardLayout from '../../components/common/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { getGroups } from '../../services/groupService';
import * as scheduleService from '../../services/scheduleService';
import { getTests } from '../../services/testService';

const formatDateTimeLocal = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const getScheduleStatus = (schedule) => {
  const now = Date.now();
  const start = new Date(schedule.startTime).getTime();
  const end = new Date(schedule.endTime).getTime();

  if (now < start) {
    return { label: 'Upcoming', tone: 'tertiary' };
  }

  if (now > end) {
    return { label: 'Ended', tone: 'muted' };
  }

  return { label: 'Running', tone: 'quaternary' };
};

const defaultFormState = {
  testId: '',
  startTime: '',
  endTime: '',
  assignedGroups: [],
};

const ExamScheduler = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [schedules, setSchedules] = useState([]);
  const [tests, setTests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [formData, setFormData] = useState(defaultFormState);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [scheduleData, testData, groupData] = await Promise.all([
        scheduleService.getSchedules(),
        getTests(),
        getGroups(),
      ]);

      setSchedules(scheduleData);
      setTests(testData.filter((test) => test.isPublished));
      setGroups(groupData);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load schedules.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createParam = searchParams.get('create');

  useEffect(() => {
    if (createParam === '1') {
      setSelectedSchedule(null);
      setFormData(defaultFormState);
      setIsModalOpen(true);
    }
  }, [createParam]);

  const openCreateModal = () => {
    setSelectedSchedule(null);
    setFormData(defaultFormState);
    setIsModalOpen(true);
    setSearchParams({ create: '1' });
  };

  const openEditModal = (schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      testId: schedule.testId?._id || schedule.testId,
      startTime: formatDateTimeLocal(schedule.startTime),
      endTime: formatDateTimeLocal(schedule.endTime),
      assignedGroups: (schedule.assignedGroups || []).map((group) => group._id || group),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSearchParams({});
  };

  const toggleGroup = (groupId) => {
    setFormData((current) => ({
      ...current,
      assignedGroups: current.assignedGroups.includes(groupId)
        ? current.assignedGroups.filter((id) => id !== groupId)
        : [...current.assignedGroups, groupId],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (selectedSchedule) {
        await scheduleService.updateSchedule(selectedSchedule._id, formData);
      } else {
        await scheduleService.createSchedule(formData);
      }

      closeModal();
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await scheduleService.deleteSchedule(id);
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasSchedules = useMemo(() => schedules.length > 0, [schedules]);

  return (
    <DashboardLayout title="Exam Scheduler">
      <section className="editorial-page-header">
        <div>
          <div className="editorial-section-label">
            <span>Scheduling</span>
          </div>
          <h2 className="editorial-page-title">Exam Scheduler</h2>
          <p className="editorial-page-copy">Schedule published tests against student groups and review the active timetable.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="editorial-button-primary"
        >
          <CalendarPlus size={18} strokeWidth={2.5} />
          Create Schedule
        </button>
      </section>

      {errorMessage ? (
        <div className="mt-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8 editorial-panel p-6">
        {isLoading ? <LoadingSpinner /> : null}
        {!isLoading && !hasSchedules ? (
          <div className="flex flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-border bg-background px-8 py-16 text-center">
            <svg viewBox="0 0 120 120" className="h-24 w-24" fill="none" aria-hidden="true">
              <rect x="18" y="22" width="84" height="76" rx="18" fill="#FDE68A" stroke="#1F2937" strokeWidth="4" />
              <path d="M38 16V36" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />
              <path d="M82 16V36" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />
              <path d="M32 54H88" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <h3 className="mt-6 font-heading text-2xl font-extrabold text-foreground">No exams scheduled yet</h3>
            <p className="mt-2 text-mutedFg">Publish a test and create its first schedule to get started.</p>
          </div>
        ) : null}
        {!isLoading && hasSchedules ? (
          <div className="overflow-x-auto">
            <table className="editorial-table">
              <thead>
                <tr>
                  {['Test', 'Start', 'End', 'Groups', 'Status', 'Actions'].map((heading) => (
                    <th key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => {
                  const status = getScheduleStatus(schedule);

                  return (
                    <tr key={schedule._id}>
                      <td className="rounded-l-[1.25rem] border-y-2 border-l-2 border-border bg-background px-4 py-4 font-bold text-foreground">
                        {schedule.testId?.title}
                      </td>
                      <td className="border-y-2 border-border bg-background px-4 py-4 text-mutedFg">
                        {new Date(schedule.startTime).toLocaleString()}
                      </td>
                      <td className="border-y-2 border-border bg-background px-4 py-4 text-mutedFg">
                        {new Date(schedule.endTime).toLocaleString()}
                      </td>
                      <td className="border-y-2 border-border bg-background px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {(schedule.assignedGroups || []).map((group) => (
                            <Badge key={group._id} tone="secondary">
                              {group.name}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="border-y-2 border-border bg-background px-4 py-4">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                      <td className="rounded-r-[1.25rem] border-y-2 border-r-2 border-border bg-background px-4 py-4">
                        <div className="flex items-center gap-2">
                          {status.label === 'Running' ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/teacher/monitor/${schedule._id}`)}
                            className="editorial-pill-button"
                            >
                              <Monitor size={16} strokeWidth={2.5} />
                              Monitor
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openEditModal(schedule)}
                            className="editorial-icon-button"
                          >
                            <Pencil size={16} strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(schedule._id)}
                            className="editorial-icon-button editorial-icon-button--accent"
                          >
                            <Trash2 size={16} strokeWidth={2.5} />
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
      </section>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={selectedSchedule ? 'Edit Schedule' : 'Create Schedule'}>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Published Test</span>
            <select
              value={formData.testId}
              onChange={(event) => setFormData((current) => ({ ...current, testId: event.target.value }))}
              className="editorial-input-surface"
              required
            >
              <option value="">Select a test</option>
              {tests.map((test) => (
                <option key={test._id} value={test._id}>
                  {test.title}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Start Time</span>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(event) => setFormData((current) => ({ ...current, startTime: event.target.value }))}
                className="editorial-input-surface"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">End Time</span>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(event) => setFormData((current) => ({ ...current, endTime: event.target.value }))}
                className="editorial-input-surface"
                required
              />
            </label>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Assign Student Groups</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {groups.map((group) => {
                const isSelected = formData.assignedGroups.includes(group._id);

                return (
                  <button
                    key={group._id}
                    type="button"
                    onClick={() => toggleGroup(group._id)}
                    className={`rounded-full border px-4 py-3 font-body text-sm font-semibold transition-all duration-200 ease-out ${
                      isSelected
                        ? 'border-accent bg-accent text-white shadow-editorialSm'
                        : 'border-border bg-muted text-foreground'
                    }`}
                  >
                    {group.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="editorial-button-primary w-full"
          >
            {isSubmitting ? 'Saving...' : selectedSchedule ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default ExamScheduler;
