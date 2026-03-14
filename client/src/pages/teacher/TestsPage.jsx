import { PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import DashboardLayout from '../../components/common/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import { deleteTest, getTests, publishTest } from '../../services/testService';

const statusBadge = {
  draft: { tone: 'tertiary', label: 'Draft' },
  published: { tone: 'quaternary', label: 'Published' },
};

const formatDate = (value) => {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleDateString();
};

const TestsPage = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTest, setSelectedTest] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [publishingTestId, setPublishingTestId] = useState(null);

  const loadTests = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const items = await getTests();
      setTests(items);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load tests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  const draftCount = useMemo(() => tests.filter((test) => !test.isPublished).length, [tests]);

  const handlePublish = async (testId) => {
    setPublishingTestId(testId);
    setErrorMessage('');

    try {
      await publishTest(testId);
      await loadTests();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to publish test.');
    } finally {
      setPublishingTestId(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedTest) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage('');

    try {
      await deleteTest(selectedTest._id);
      setSelectedTest(null);
      await loadTests();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete test.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout title="Tests">
      <section className="editorial-page-header">
        <div>
          <div className="editorial-section-label">
            <span>Tests</span>
          </div>
          <h2 className="editorial-page-title">Manage all tests</h2>
          <p className="editorial-page-copy">
            Create clean tests, review drafts, publish finished assessments, and remove discarded work.
          </p>
        </div>
      </section>

      <section className="mt-8 editorial-panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-3">
            <Badge tone="accent">{tests.length} total</Badge>
            <Badge tone="secondary">{draftCount} draft</Badge>
          </div>
          <button
            type="button"
            onClick={() => navigate('/teacher/tests/new?fresh=1')}
            className="editorial-button-secondary"
          >
            <PlusCircle size={18} strokeWidth={2.5} />
            Create New Test
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-secondary bg-secondary/15 px-4 py-3 font-body text-sm font-medium text-foreground">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? <div className="mt-6"><LoadingSpinner /></div> : null}

        {!isLoading && tests.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="editorial-table min-w-full">
              <thead>
                <tr>
                  {['Title', 'Status', 'Questions', 'Updated', 'Actions'].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tests.map((test) => {
                  const status = test.isPublished ? statusBadge.published : statusBadge.draft;

                  return (
                    <tr key={test._id}>
                      <td className="rounded-l-2xl border border-border bg-background px-4 py-4 font-semibold text-foreground">
                        {test.title}
                      </td>
                      <td className="border-y border-border bg-background px-4 py-4">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                      <td className="border-y border-border bg-background px-4 py-4 text-mutedFg">{test.questionCount || 0}</td>
                      <td className="border-y border-border bg-background px-4 py-4 text-mutedFg">{formatDate(test.updatedAt || test.createdAt)}</td>
                      <td className="rounded-r-2xl border border-border bg-background px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/teacher/tests/${test._id}`)}
                            className="editorial-button-secondary"
                          >
                            Edit
                          </button>
                          {!test.isPublished ? (
                            <button
                              type="button"
                              onClick={() => handlePublish(test._id)}
                              disabled={publishingTestId === test._id}
                              className="editorial-pill-button disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {publishingTestId === test._id ? 'Publishing...' : 'Publish'}
                            </button>
                          ) : null}
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

        {!isLoading && tests.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-background p-8 text-center text-mutedFg">
            No tests yet. Create a clean new test to get started.
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
              onClick={handleDelete}
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

export default TestsPage;
