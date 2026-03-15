import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Badge from '../../components/common/Badge';
import DashboardLayout from '../../components/common/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import * as userService from '../../services/userService';

const roleToneMap = {
  admin: 'accent',
  teacher: 'secondary',
  student: 'quaternary',
};

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Teacher', value: 'teacher' },
  { label: 'Student', value: 'student' },
];

const defaultFormState = {
  name: '',
  email: '',
  password: '',
  role: 'student',
  tag: '',
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-border bg-card px-8 py-16 text-center shadow-editorialMd">
    <svg viewBox="0 0 120 120" className="h-24 w-24" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="44" fill="#FDE68A" stroke="#1F2937" strokeWidth="4" />
      <circle cx="45" cy="52" r="5" fill="#1F2937" />
      <circle cx="75" cy="52" r="5" fill="#1F2937" />
      <path d="M42 76C50 84 70 84 78 76" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />
    </svg>
    <h3 className="mt-6 font-heading text-2xl font-extrabold text-foreground">No users yet</h3>
    <p className="mt-3 max-w-md text-mutedFg">Create your first user to start filling the system with teachers and students.</p>
  </div>
);

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load users.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreateModal = () => {
    setSelectedUser(null);
    setFormData(defaultFormState);
    setIsFormOpen(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      tag: user.tag || '',
    });
    setIsFormOpen(true);
  };

  const handleDeletePrompt = (user) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (selectedUser) {
        await userService.updateUser(selectedUser._id, {
          name: formData.name,
          email: formData.email,
          ...(formData.password ? { password: formData.password } : {}),
          role: formData.role,
          tag: formData.tag,
        });
      } else {
        await userService.createUser(formData);
      }

      setIsFormOpen(false);
      setFormData(defaultFormState);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await userService.deleteUser(selectedUser._id);
      setIsDeleteOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to delete user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedUsers = useMemo(() => [...users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [users]);
  const searchSuggestions = useMemo(
    () => [...new Set(users.flatMap((user) => [user.name, user.email, user.role, user.tag]).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [users],
  );
  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return sortedUsers;
    }

    return sortedUsers.filter((user) => (
      user.name.toLowerCase().includes(normalizedSearch)
      || user.email.toLowerCase().includes(normalizedSearch)
      || user.role.toLowerCase().includes(normalizedSearch)
      || (user.tag || '').toLowerCase().includes(normalizedSearch)
    ));
  }, [searchTerm, sortedUsers]);

  return (
    <DashboardLayout title="User Management">
      <section className="editorial-page-header">
        <div>
          <div className="editorial-section-label">
            <span>Users</span>
          </div>
          <h2 className="editorial-page-title">Team Directory</h2>
          <p className="editorial-page-copy">Create, edit, and organize every admin, teacher, and student account.</p>
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[28rem] lg:flex-row lg:items-center lg:justify-end">
          <div className="w-full lg:min-w-[20rem]">
            <label className="sr-only" htmlFor="user-directory-search">Search users</label>
            <input
              id="user-directory-search"
              type="search"
              list="user-directory-search-options"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, role, or tag"
              className="editorial-input-surface w-full"
              autoComplete="on"
            />
            <datalist id="user-directory-search-options">
              {searchSuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="editorial-button-primary shrink-0"
          >
            <Plus size={18} />
            Add User
          </button>
        </div>
      </section>

      {errorMessage ? (
        <div className="mt-6 rounded-2xl border border-secondary bg-secondary/15 px-4 py-3 font-body text-sm font-medium text-foreground">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8 editorial-panel p-6">
        {isLoading ? <LoadingSpinner /> : null}
        {!isLoading && sortedUsers.length === 0 ? <EmptyState /> : null}
        {!isLoading && sortedUsers.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 text-sm text-mutedFg sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing <span className="font-semibold text-foreground">{filteredUsers.length}</span> of{' '}
                <span className="font-semibold text-foreground">{sortedUsers.length}</span> users
              </p>
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="font-semibold text-accent transition-colors duration-200 hover:text-accent/80"
                >
                  Clear search
                </button>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              {filteredUsers.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-border bg-background px-6 py-12 text-center text-sm text-mutedFg">
                  No users match <span className="font-semibold text-foreground">{searchTerm}</span>.
                </div>
              ) : (
                <table className="editorial-table">
                  <thead>
                    <tr>
                      {['Name', 'Email', 'Role', 'Tag', 'Created', 'Actions'].map((heading) => (
                        <th key={heading}>
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user._id}>
                        <td className="rounded-l-[1.25rem] border-y-2 border-l-2 border-border bg-background px-4 py-4 font-bold text-foreground">{user.name}</td>
                        <td className="border-y-2 border-border bg-background px-4 py-4 text-mutedFg">{user.email}</td>
                        <td className="border-y-2 border-border bg-background px-4 py-4">
                          <Badge tone={roleToneMap[user.role] || 'muted'}>{user.role}</Badge>
                        </td>
                        <td className="border-y-2 border-border bg-background px-4 py-4 text-foreground">
                          {user.tag ? (
                            <span className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                              {user.tag}
                            </span>
                          ) : (
                            <span className="text-mutedFg">—</span>
                          )}
                        </td>
                        <td className="border-y-2 border-border bg-background px-4 py-4 text-mutedFg">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="rounded-r-[1.25rem] border-y-2 border-r-2 border-border bg-background px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(user)}
                              className="editorial-icon-button"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePrompt(user)}
                              className="editorial-icon-button editorial-icon-button--accent"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={selectedUser ? 'Edit User' : 'Add User'}>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Name</span>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="editorial-input-surface"
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Email</span>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="editorial-input-surface"
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Password</span>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={selectedUser ? 'Leave blank to keep current password' : 'Create a password'}
              className="editorial-input-surface"
              required={!selectedUser}
            />
          </label>
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Role</legend>
            <div className="flex flex-wrap gap-3">
              {roleOptions.map((roleOption) => {
                const isSelected = formData.role === roleOption.value;

                return (
                  <label key={roleOption.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value={roleOption.value}
                      checked={isSelected}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span
                      className={`inline-flex rounded-full border px-4 py-3 font-body text-sm font-semibold transition-all duration-200 ease-out ${
                        isSelected ? 'border-accent bg-accent text-white shadow-editorialSm' : 'border-border bg-muted text-foreground'
                      }`}
                    >
                      {roleOption.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <label className="block space-y-2">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-mutedFg">Tag</span>
            <input
              name="tag"
              value={formData.tag}
              onChange={handleChange}
              placeholder="Inspector, Assistant, Field Team"
              className="editorial-input-surface"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="editorial-button-primary w-full"
          >
            {isSubmitting ? 'Saving...' : selectedUser ? 'Save Changes' : 'Create User'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete User?">
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-accent bg-accent/10 p-4 font-body text-sm leading-7 text-foreground">
            This action removes <strong>{selectedUser?.name}</strong> from the platform. This cannot be undone.
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="editorial-button-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="editorial-button-primary flex-1"
            >
              {isSubmitting ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default UserManagement;
