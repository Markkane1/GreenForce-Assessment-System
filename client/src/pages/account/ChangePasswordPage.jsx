import { KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import * as authService from '../../services/authService';

const getDashboardPath = (role) => {
  if (role === 'admin') {
    return '/admin/dashboard';
  }

  if (role === 'teacher') {
    return '/teacher/dashboard';
  }

  return '/student/dashboard';
};

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (formData.newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMessage('New password and confirmation must match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authService.changePassword(formData.currentPassword, formData.newPassword);
      setSuccessMessage(response.message || 'Password changed successfully.');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      setErrorMessage(error.message || 'Unable to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Change Password">
      <section className="editorial-panel mx-auto max-w-2xl p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-accent text-white shadow-editorialSm">
            <KeyRound size={28} strokeWidth={2.5} className="text-accentFg" />
          </div>
          <div>
            <h2 className="font-heading text-4xl font-semibold text-foreground">Change Password</h2>
            <p className="mt-2 max-w-xl font-body leading-8 text-mutedFg">
              Update your account password. The current password is required before the change is applied.
            </p>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-full border-2 border-secondary bg-secondary/20 px-4 py-2 text-sm font-medium text-foreground">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-6 rounded-full border-2 border-quaternary bg-quaternary/20 px-4 py-2 text-sm font-medium text-foreground">
            {successMessage}
          </div>
        ) : null}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="editorial-input-label">Current Password</span>
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              value={formData.currentPassword}
              onChange={handleChange}
              required
              className="editorial-input-surface"
            />
          </label>

          <label className="block space-y-2">
            <span className="editorial-input-label">New Password</span>
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={formData.newPassword}
              onChange={handleChange}
              required
              className="editorial-input-surface"
            />
          </label>

          <label className="block space-y-2">
            <span className="editorial-input-label">Confirm New Password</span>
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="editorial-input-surface"
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate(getDashboardPath(user?.role))}
              className="editorial-button-secondary flex-1"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="editorial-button-primary flex-1 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <ShieldCheck size={18} strokeWidth={2.5} />
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </section>
    </DashboardLayout>
  );
};

export default ChangePasswordPage;
