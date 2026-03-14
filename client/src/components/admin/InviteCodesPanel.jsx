import {
  Check,
  CheckCircle,
  Copy,
  Download,
  Key,
  LayoutGrid,
  Lock,
  RefreshCw,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../common/Modal';
import * as inviteCodeService from '../../services/inviteCodeService';

const filterOptions = ['All', 'Available', 'Used'];

const sanitizeFileName = (value) =>
  String(value || 'group')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'group';

const escapeCsvValue = (value) => {
  const stringValue = String(value ?? '');
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
};

const copyToClipboard = async (value) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const tempInput = document.createElement('textarea');
  tempInput.value = value;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
};

const InviteCodesPanel = ({ isOpen, onClose, group }) => {
  const [codes, setCodes] = useState([]);
  const [filter, setFilter] = useState('All');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkCount, setBulkCount] = useState('10');
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [copiedCode, setCopiedCode] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const deleteTimerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const copyTimerRef = useRef(null);

  const loadCodes = async ({ silent = false } = {}) => {
    if (!group?._id) {
      return;
    }

    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage('');

    try {
      const inviteCodes = await inviteCodeService.getCodesByGroup(group._id);
      setCodes(inviteCodes);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load invite codes.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCodes();
      setFilter('All');
      setGeneratedCode('');
      setCopiedCode('');
      setConfirmDeleteId('');
      setToastMessage('');
      setBulkCount('10');
      setErrorMessage('');
    }
  }, [group?._id, isOpen]);

  useEffect(() => () => {
    window.clearTimeout(deleteTimerRef.current);
    window.clearTimeout(toastTimerRef.current);
    window.clearTimeout(copyTimerRef.current);
  }, []);

  const filteredCodes = useMemo(() => {
    if (filter === 'Available') {
      return codes.filter((code) => !code.isUsed);
    }

    if (filter === 'Used') {
      return codes.filter((code) => code.isUsed);
    }

    return codes;
  }, [codes, filter]);

  const totalCount = codes.length;
  const unusedCount = codes.filter((code) => !code.isUsed).length;

  const handleCopy = async (code) => {
    try {
      await copyToClipboard(code);
      setCopiedCode(code);
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedCode('');
      }, 2000);
    } catch {
      setErrorMessage('Unable to copy invite code.');
    }
  };

  const handleGenerateSingle = async () => {
    if (!group?._id) {
      return;
    }

    setIsGeneratingSingle(true);
    setErrorMessage('');

    try {
      const inviteCode = await inviteCodeService.generateSingle(group._id);
      setGeneratedCode(inviteCode.code);
      await loadCodes({ silent: true });
    } catch (error) {
      setErrorMessage(error.message || 'Unable to generate invite code.');
    } finally {
      setIsGeneratingSingle(false);
    }
  };

  const handleGenerateBulk = async () => {
    const count = Number(bulkCount);
    if (!group?._id || Number.isNaN(count) || count < 1 || count > 500) {
      return;
    }

    setIsGeneratingBulk(true);
    setErrorMessage('');

    try {
      await inviteCodeService.generateBulk(group._id, count);
      setIsBulkModalOpen(false);
      await loadCodes({ silent: true });
      setToastMessage(`${count} codes generated successfully`);
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => {
        setToastMessage('');
      }, 3000);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to generate invite codes.');
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  const handleDeleteClick = async (inviteCode) => {
    if (confirmDeleteId !== inviteCode._id) {
      setConfirmDeleteId(inviteCode._id);
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = window.setTimeout(() => {
        setConfirmDeleteId('');
      }, 3000);
      return;
    }

    try {
      await inviteCodeService.deleteCode(inviteCode._id);
      setCodes((current) => current.filter((code) => code._id !== inviteCode._id));
      setConfirmDeleteId('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete invite code.');
    }
  };

  const handleExport = () => {
    const rows = codes.map((code) => [
      code.code,
      code.isUsed ? 'Used' : 'Available',
      group?.name || '',
      code.usedBy?.name || '',
      code.usedBy?.email || '',
      code.usedAt ? new Date(code.usedAt).toISOString() : '',
      code.createdAt ? new Date(code.createdAt).toISOString() : '',
    ]);

    const csv = [
      ['Code', 'Status', 'Group', 'Used By', 'Used By Email', 'Used At', 'Created At'],
      ...rows,
    ]
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `invite-codes-${sanitizeFileName(group?.name)}-${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const bulkCountNumber = Number(bulkCount);
  const isBulkCountInvalid =
    !bulkCount || Number.isNaN(bulkCountNumber) || bulkCountNumber < 1 || bulkCountNumber > 500;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title=""
        panelClassName="max-w-3xl max-h-[90vh] overflow-y-auto"
        contentClassName="space-y-8"
        showCloseButton={false}
      >
        <div className="relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 top-0 inline-flex items-center justify-center rounded-full border-2 border-foreground bg-secondary px-4 py-2 text-sm font-medium text-foreground shadow-pop transition-all duration-200 ease-bounce hover:shadow-pop-hover active:shadow-pop-press"
          >
            <X size={16} strokeWidth={2.5} />
          </button>

          <div className="flex items-start gap-4 pr-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground bg-accent text-white shadow-pop">
              <Key size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-heading text-2xl font-extrabold text-foreground">
                Invite Codes — {group?.name}
              </h3>
              <p className="mt-1 text-sm text-mutedFg">
                Generate, track, and export group-specific invite codes.
              </p>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border-2 border-border bg-muted p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-secondary text-foreground shadow-pop-press">
                <Ticket size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-heading text-lg font-bold text-foreground">Generate Single Code</h4>
                <p className="mt-1 text-sm text-mutedFg">Generate one invite code for this group.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerateSingle}
              disabled={isGeneratingSingle}
              className="mt-5 w-full rounded-full border-2 border-foreground bg-secondary px-5 py-3 font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isGeneratingSingle ? 'Generating...' : 'Generate Code'}
            </button>
            {generatedCode ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border-2 border-foreground bg-card px-4 py-3 shadow-pop-press">
                <span className="font-heading text-lg font-bold tracking-wide text-foreground">{generatedCode}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(generatedCode)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-accent text-accentFg shadow-pop-press"
                >
                  {copiedCode === generatedCode ? (
                    <Check size={16} strokeWidth={2.5} />
                  ) : (
                    <Copy size={16} strokeWidth={2.5} />
                  )}
                </button>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border-2 border-border bg-muted p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-tertiary text-foreground shadow-pop-press">
                <LayoutGrid size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-heading text-lg font-bold text-foreground">Generate in Bulk</h4>
                <p className="mt-1 text-sm text-mutedFg">Generate multiple codes at once.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="mt-5 w-full rounded-full border-2 border-foreground bg-secondary px-5 py-3 font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
            >
              Generate Bulk Codes
            </button>
          </div>
        </section>

        <section className="space-y-4 rounded-[1.75rem] border-2 border-border bg-background p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h4 className="font-heading text-xl font-bold text-foreground">
              All Invite Codes ({totalCount} total, {unusedCount} available)
            </h4>
            <button
              type="button"
              onClick={() => loadCodes({ silent: true })}
              className={`inline-flex items-center justify-center rounded-full border-2 border-foreground bg-secondary px-4 py-2 text-sm font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:shadow-pop-hover active:shadow-pop-press ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={16} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            {filterOptions.map((option) => {
              const isSelected = option === filter;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition-all duration-200 ease-bounce ${
                    isSelected
                      ? 'border-foreground bg-accent text-accentFg shadow-pop-press'
                      : 'border-border bg-muted text-mutedFg shadow-pop-soft'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-mutedFg">Loading invite codes...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-mutedFg">
                    <th className="px-3">Code</th>
                    <th className="px-3">Status</th>
                    <th className="px-3">Used By</th>
                    <th className="px-3">Used At</th>
                    <th className="px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.map((inviteCode) => (
                    <tr key={inviteCode._id} className="rounded-xl border-2 border-border bg-card shadow-pop-soft">
                      <td className="rounded-l-xl border-y-2 border-l-2 border-border px-3 py-3">
                        <div className="flex items-center gap-3">
                          <span className="font-heading text-sm font-bold tracking-wide text-foreground">
                            {inviteCode.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(inviteCode.code)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-foreground bg-muted text-foreground shadow-pop-soft"
                          >
                            {copiedCode === inviteCode.code ? (
                              <Check size={14} strokeWidth={2.5} />
                            ) : (
                              <Copy size={14} strokeWidth={2.5} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="border-y-2 border-border px-3 py-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-heading ${
                            inviteCode.isUsed
                              ? 'border-border bg-muted text-mutedFg'
                              : 'border-quaternary bg-quaternary/20 text-foreground'
                          }`}
                        >
                          {inviteCode.isUsed ? 'Used' : 'Available'}
                        </span>
                      </td>
                      <td className="border-y-2 border-border px-3 py-3 text-sm text-foreground">
                        {inviteCode.usedBy ? (
                          <div>
                            <p className="font-semibold">{inviteCode.usedBy.name}</p>
                            <p className="text-mutedFg">{inviteCode.usedBy.email}</p>
                          </div>
                        ) : (
                          <span className="text-mutedFg">-</span>
                        )}
                      </td>
                      <td className="border-y-2 border-border px-3 py-3 text-sm text-mutedFg">
                        {formatDate(inviteCode.usedAt)}
                      </td>
                      <td className="rounded-r-xl border-y-2 border-r-2 border-border px-3 py-3">
                        {inviteCode.isUsed ? (
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-border bg-muted text-mutedFg">
                            <Lock size={14} strokeWidth={2.5} />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(inviteCode)}
                            className={`inline-flex items-center gap-2 rounded-full border-2 border-foreground px-3 py-2 text-sm font-bold shadow-pop-soft transition-all duration-200 ease-bounce hover:shadow-pop-hover ${
                              confirmDeleteId === inviteCode._id
                                ? 'bg-secondary text-foreground'
                                : 'bg-card text-secondary hover:text-secondary'
                            }`}
                          >
                            <Trash2 size={14} strokeWidth={2.5} />
                            {confirmDeleteId === inviteCode._id ? 'Confirm?' : 'Delete'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCodes.length === 0 ? (
                <div className="py-12 text-center text-sm text-mutedFg">No invite codes found for this filter.</div>
              ) : null}
            </div>
          )}

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-foreground bg-secondary px-6 py-3 font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
          >
            <Download size={18} strokeWidth={2.5} />
            Export as CSV
          </button>
        </section>
      </Modal>

      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="How many codes?"
        panelClassName="max-w-sm"
        showCloseButton={false}
      >
        <div className="space-y-5 text-center">
          <input
            type="number"
            min="1"
            max="500"
            value={bulkCount}
            onChange={(event) => setBulkCount(event.target.value)}
            className="mx-auto block w-32 appearance-none rounded-xl border-2 border-foreground p-4 text-center font-heading text-4xl font-bold text-accent shadow-pop-press outline-none"
          />
          <p className="text-xs text-mutedFg">Maximum 500 codes per batch</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(false)}
              className="flex-1 rounded-full border-2 border-foreground bg-secondary px-5 py-3 font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:shadow-pop-hover active:shadow-pop-press"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerateBulk}
              disabled={isBulkCountInvalid || isGeneratingBulk}
              className="flex-1 rounded-full border-2 border-foreground bg-accent px-5 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:shadow-pop-hover active:shadow-pop-press disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isGeneratingBulk ? 'Generating...' : `Generate ${bulkCountNumber || 0} Codes`}
            </button>
          </div>
        </div>
      </Modal>

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-quaternary px-4 py-2 text-sm font-bold text-foreground shadow-pop-press animate-pop-in">
          <CheckCircle size={16} strokeWidth={2.5} />
          {toastMessage}
        </div>
      ) : null}
    </>
  );
};

export default InviteCodesPanel;
