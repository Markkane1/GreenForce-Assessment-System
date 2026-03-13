import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-border bg-card px-8 py-16 text-center shadow-pop-soft">
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = async () => {
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
  };

  useEffect(() => {
    loadUsers();
  }, []);

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
          role: formData.role,
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

  return (
    <DashboardLayout title="User Management">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-heading text-4xl font-extrabold text-foreground">Team Directory</h2>
          <p className="mt-2 text-mutedFg">Create, edit, and organize every admin, teacher, and student account.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-foreground bg-accent px-6 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
        >
          <Plus size={18} />
          Add User
        </button>
      </section>

      {errorMessage ? (
        <div className="mt-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8 rounded-[2rem] border-2 border-border bg-card p-6 shadow-pop-soft">
        {isLoading ? <LoadingSpinner /> : null}
        {!isLoading && sortedUsers.length === 0 ? <EmptyState /> : null}
        {!isLoading && sortedUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr>
                  {['Name', 'Email', 'Role', 'Created', 'Actions'].map((heading) => (
                    <th key={heading} className="px-4 text-left text-xs font-bold uppercase tracking-[0.22em] text-mutedFg">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => (
                  <tr key={user._id}>
                    <td className="rounded-l-[1.25rem] border-y-2 border-l-2 border-border bg-background px-4 py-4 font-bold text-foreground">{user.name}</td>
                    <td className="border-y-2 border-border bg-background px-4 py-4 text-mutedFg">{user.email}</td>
                    <td className="border-y-2 border-border bg-background px-4 py-4">
                      <Badge tone={roleToneMap[user.role] || 'muted'}>{user.role}</Badge>
                    </td>
                    <td className="border-y-2 border-border bg-background px-4 py-4 text-mutedFg">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="rounded-r-[1.25rem] border-y-2 border-r-2 border-border bg-background px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-secondary text-foreground shadow-pop-press"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePrompt(user)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-accent text-accentFg shadow-pop-press"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              className="w-full rounded-lg border-2 border-foreground bg-background px-4 py-3 text-foreground shadow-pop-soft outline-none transition-all duration-200 ease-bounce focus:shadow-pop"
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
              className="w-full rounded-lg border-2 border-foreground bg-background px-4 py-3 text-foreground shadow-pop-soft outline-none transition-all duration-200 ease-bounce focus:shadow-pop"
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
              className="w-full rounded-lg border-2 border-foreground bg-background px-4 py-3 text-foreground shadow-pop-soft outline-none transition-all duration-200 ease-bounce focus:shadow-pop"
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
                      className={`inline-flex rounded-full border-2 px-4 py-3 text-sm font-bold transition-all duration-200 ease-bounce ${
                        isSelected ? 'border-foreground bg-accent text-accentFg shadow-pop' : 'border-border bg-muted text-foreground'
                      }`}
                    >
                      {roleOption.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full border-2 border-foreground bg-accent px-6 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-1 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
          >
            {isSubmitting ? 'Saving...' : selectedUser ? 'Save Changes' : 'Create User'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete User?">
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border-2 border-accent bg-accent/10 p-4 text-sm leading-7 text-foreground">
            This action removes <strong>{selectedUser?.name}</strong> from the platform. This cannot be undone.
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="flex-1 rounded-full border-2 border-foreground bg-secondary px-6 py-3 font-bold text-foreground shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="flex-1 rounded-full border-2 border-foreground bg-accent px-6 py-3 font-bold text-accentFg shadow-pop transition-all duration-200 ease-bounce hover:-translate-y-0.5 hover:shadow-pop-hover active:translate-y-0.5 active:shadow-pop-press"
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
