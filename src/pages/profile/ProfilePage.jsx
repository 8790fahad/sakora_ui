import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Save,
  Shield,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  changePassword,
  fetchUserProfile,
  selectUser,
  updateUserProfile,
} from "../../store/slices/authSlice";

const ProfilePage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  useEffect(() => {
    if (!user) return;
    setForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      phone: user.phone || "",
    });
  }, [user?.id, user?.firstName, user?.lastName, user?.phone]);

  const initials = `${user?.firstName?.[0] || ""}${
    user?.lastName?.[0] || ""
  }`.toUpperCase();

  const onSaveProfile = async (event) => {
    event.preventDefault();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const phone = form.phone.trim();

    if (firstName.length < 2 || lastName.length < 2) {
      toast.error("First and last name must be at least 2 characters");
      return;
    }

    setSavingProfile(true);
    try {
      await dispatch(
        updateUserProfile({
          firstName,
          lastName,
          phone: phone || undefined,
        })
      ).unwrap();
      toast.success("Profile updated");
    } catch (error) {
      toast.error(
        typeof error === "string" ? error : error?.message || "Update failed"
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await dispatch(
        changePassword({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        })
      ).unwrap();
      toast.success("Password changed");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(
        typeof error === "string"
          ? error
          : error?.message || "Could not change password"
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          User Profile
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your personal details and password
        </p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center flex-shrink-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt=""
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <span className="text-white text-xl font-semibold">
                {initials || <User className="w-7 h-7" />}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-gray-500 truncate flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              {user?.email || "—"}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {user?.role && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-800 capitalize">
                  <Shield className="w-3 h-3" />
                  {user.role}
                </span>
              )}
              {user?.business?.name && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  <Building2 className="w-3 h-3" />
                  {user.business.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={onSaveProfile} className="card p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Personal details
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Your name and phone on this account
            </p>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={savingProfile}
          >
            <Save className="w-4 h-4 mr-2" />
            {savingProfile ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              First name
            </label>
            <input
              type="text"
              className="form-input"
              value={form.firstName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, firstName: e.target.value }))
              }
              required
              minLength={2}
              maxLength={50}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Last name
            </label>
            <input
              type="text"
              className="form-input"
              value={form.lastName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, lastName: e.target.value }))
              }
              required
              minLength={2}
              maxLength={50}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                className="form-input pl-9 bg-gray-50"
                value={user?.email || ""}
                disabled
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                className="form-input pl-9"
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="e.g. 0803 123 4567"
              />
            </div>
          </div>
        </div>
      </form>

      <form onSubmit={onChangePassword} className="card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Change password
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Use a strong password you do not reuse elsewhere
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Current password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={showCurrent ? "text" : "password"}
              className="form-input pl-9 pr-10"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  currentPassword: e.target.value,
                }))
              }
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              onClick={() => setShowCurrent((v) => !v)}
              tabIndex={-1}
            >
              {showCurrent ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className="form-input pr-10"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShowNew((v) => !v)}
                tabIndex={-1}
              >
                {showNew ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm new password
            </label>
            <input
              type={showNew ? "text" : "password"}
              className="form-input"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-outline"
          disabled={savingPassword}
        >
          <Lock className="w-4 h-4 mr-2" />
          {savingPassword ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
