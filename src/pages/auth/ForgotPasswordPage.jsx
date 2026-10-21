import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { AlertCircle, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";

const emailSchema = yup.object().shape({
  email: yup
    .string()
    .email("Please enter a valid email address")
    .required("Email is required"),
});

const resetSchema = yup.object().shape({
  code: yup
    .string()
    .trim()
    .matches(/^\d{6}$/, "Enter the 6-digit code from your email")
    .required("Reset code is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .matches(/[a-zA-Z]/, "Password must contain at least one letter")
    .matches(/[0-9]/, "Password must contain at least one number")
    .required("Password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], "Passwords must match")
    .required("Please confirm your password"),
});

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors, isSubmitting: isRequesting },
  } = useForm({
    resolver: yupResolver(emailSchema),
  });

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors, isSubmitting: isResetting },
    setValue: setResetValue,
  } = useForm({
    resolver: yupResolver(resetSchema),
    defaultValues: { code: "" },
  });

  const onRequestCode = async (data) => {
    try {
      setError("");
      const normalized = data.email.trim().toLowerCase();
      await api.auth.forgotPassword({ email: normalized });
      setEmail(normalized);
      setStep("reset");
      setResendCooldown(30);
      toast.success("If that email exists, a reset code was sent.");
    } catch (err) {
      setError(err.message || "Could not send reset code.");
    }
  };

  const onResend = async () => {
    if (resendCooldown > 0 || !email) return;
    try {
      setError("");
      await api.auth.forgotPassword({ email });
      setResendCooldown(30);
      toast.success("A new code has been sent.");
    } catch (err) {
      setError(err.message || "Could not resend code.");
    }
  };

  const onReset = async (data) => {
    try {
      setError("");
      await api.auth.resetPassword({
        email,
        code: data.code.trim(),
        password: data.password,
      });
      toast.success("Password updated. Sign in with your new password.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.message || "Could not reset password.");
    }
  };

  if (step === "reset") {
    return (
      <div className="w-full">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Set a new password
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enter the code sent to{" "}
            <span className="font-medium text-gray-900 dark:text-white">
              {email}
            </span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleResetSubmit(onReset)} className="space-y-5">
          <div>
            <label htmlFor="code" className="form-label">
              Reset code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className={`form-input text-center text-2xl tracking-[0.4em] font-semibold ${
                resetErrors.code
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
              {...registerReset("code", {
                onChange: (event) => {
                  const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                  setResetValue("code", next, { shouldValidate: true });
                },
              })}
            />
            {resetErrors.code && (
              <p className="form-error">{resetErrors.code.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="form-label">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Create a new password"
                className={`form-input pr-10 ${
                  resetErrors.password
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : ""
                }`}
                {...registerReset("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {resetErrors.password && (
              <p className="form-error">{resetErrors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="form-label">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Confirm your new password"
              className={`form-input ${
                resetErrors.confirmPassword
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
              {...registerReset("confirmPassword")}
            />
            {resetErrors.confirmPassword && (
              <p className="form-error">{resetErrors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isResetting}
            className="btn btn-primary btn-lg w-full mobile-btn"
          >
            {isResetting ? (
              <div className="flex items-center justify-center">
                <div className="spinner w-4 h-4 mr-2"></div>
                Updating password...
              </div>
            ) : (
              "Update password"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            Didn&apos;t get the code?{" "}
            <button
              type="button"
              onClick={onResend}
              disabled={resendCooldown > 0}
              className="font-semibold text-primary-600 hover:text-primary-500 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </p>
          <button
            type="button"
            onClick={() => {
              setStep("request");
              setError("");
            }}
            className="font-medium text-gray-500 hover:text-gray-700"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Forgot password
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Enter your email and we&apos;ll send a reset code
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleEmailSubmit(onRequestCode)} className="space-y-6">
        <div>
          <label htmlFor="email" className="form-label">
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              className={`form-input pl-10 ${
                emailErrors.email
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
              {...registerEmail("email")}
            />
          </div>
          {emailErrors.email && (
            <p className="form-error">{emailErrors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isRequesting}
          className="btn btn-primary btn-lg w-full mobile-btn"
        >
          {isRequesting ? (
            <div className="flex items-center justify-center">
              <div className="spinner w-4 h-4 mr-2"></div>
              Sending code...
            </div>
          ) : (
            "Send reset code"
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Remembered your password?{" "}
          <Link
            to="/login"
            className="font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
