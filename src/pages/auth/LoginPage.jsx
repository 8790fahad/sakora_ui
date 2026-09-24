import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

import {
  loginUser,
  selectAuthLoading,
  selectAuthError,
} from "../../store/slices/authSlice";

// Validation schema
const loginSchema = yup.object().shape({
  email: yup
    .string()
    .email("Please enter a valid email address")
    .required("Email is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

const LoginPage = () => {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      await dispatch(loginUser(data)).unwrap();
      toast.success("Welcome back!");
    } catch (error) {
      // Error is handled by the thunk and shown via the error state
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Sign in to sell, record sales, and share your shop
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email */}
        <div>
          <label htmlFor="email" className="form-label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            className={`form-input ${
              errors.email
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : ""
            }`}
            {...register("email")}
          />
          {errors.email && <p className="form-error">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className={`form-input pr-10 ${
                errors.password
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
              {...register("password")}
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
          {errors.password && (
            <p className="form-error">{errors.password.message}</p>
          )}
        </div>

        {/* Remember me & Forgot password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember"
              type="checkbox"
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label
              htmlFor="remember"
              className="ml-2 text-sm text-gray-700 dark:text-gray-300"
            >
              Remember me
            </label>
          </div>
          <Link
            to="/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading || isSubmitting}
          className="btn btn-primary btn-lg w-full mobile-btn"
        >
          {isLoading || isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="spinner w-4 h-4 mr-2"></div>
              Signing in...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <LogIn className="w-5 h-5 mr-2" />
              Sign in
            </div>
          )}
        </button>
      </form>

      {/* Sign up link */}
      <div className="mt-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            Sign up now
          </Link>
        </p>
      </div>

      {/* Demo credentials */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Demo Account (for testing):
        </p>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div>Email: demo@sakora.com</div>
          <div>Password: demo123</div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

