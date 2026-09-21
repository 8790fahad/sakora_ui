import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  User,
  Mail,
  Phone,
  Building2,
  Lock,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  registerUser,
  selectAuthLoading,
  selectAuthError,
  clearError,
} from "../../store/slices/authSlice";

// Validation schema
const registerSchema = yup.object().shape({
  name: yup
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters")
    .required("Full name is required"),
  email: yup
    .string()
    .email("Please enter a valid email address")
    .required("Email is required"),
  phone: yup
    .string()
    .matches(/^[0-9+\-\s()]*$/, "Please enter a valid phone number")
    .min(10, "Phone number must be at least 10 digits")
    .required("Phone number is required"),
  businessName: yup
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name cannot exceed 100 characters")
    .required("Business name is required"),
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
  acceptTerms: yup
    .boolean()
    .oneOf([true], "You must accept the terms and conditions")
    .required("You must accept the terms and conditions"),
});

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      acceptTerms: false,
    },
  });

  // Watch password for strength indicator
  const password = watch("password", "");

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { level: 0, text: "", color: "" };
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 1) return { level: 1, text: "Weak", color: "bg-red-500" };
    if (strength <= 2)
      return { level: 2, text: "Fair", color: "bg-orange-500" };
    if (strength <= 3)
      return { level: 3, text: "Good", color: "bg-yellow-500" };
    if (strength <= 4)
      return { level: 4, text: "Strong", color: "bg-green-500" };
    return { level: 5, text: "Very Strong", color: "bg-emerald-500" };
  };

  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data) => {
    try {
      // Clear any previous errors
      dispatch(clearError());

      console.log("Form data:", data); // Debug log

      // Split full name into first and last name
      const nameParts = (data.name || "").trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName =
        nameParts.length > 1
          ? nameParts.slice(1).join(" ")
          : nameParts[0] || "";

      console.log("Parsed names:", { firstName, lastName }); // Debug log

      // Prepare registration data
      const registrationData = {
        firstName,
        lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        businessName: data.businessName,
      };

      console.log("Sending registration data:", registrationData); // Debug log

      await dispatch(registerUser(registrationData)).unwrap();
      toast.success("Account created successfully! Welcome to Inventria!");
      // Navigation will happen automatically after successful registration
    } catch (error) {
      console.error("Registration failed:", error);
      toast.error(error || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Create Account
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Start managing your business today
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Full Name */}
        <div>
          <label htmlFor="name" className="form-label">
            Full Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              className={`form-input pl-10 ${
                errors.name
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
              {...register("name")}
            />
          </div>
          {errors.name && <p className="form-error">{errors.name.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="form-label">
            Email Address
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
                errors.email
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
              {...register("email")}
            />
          </div>
          {errors.email && <p className="form-error">{errors.email.message}</p>}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="form-label">
            Phone Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="Enter your phone number"
              className={`form-input pl-10 ${
                errors.phone
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
              {...register("phone")}
            />
          </div>
          {errors.phone && <p className="form-error">{errors.phone.message}</p>}
        </div>

        {/* Business Name */}
        <div>
          <label htmlFor="businessName" className="form-label">
            Business Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="businessName"
              type="text"
              autoComplete="organization"
              placeholder="Enter your business name"
              className={`form-input pl-10 ${
                errors.businessName
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
              {...register("businessName")}
            />
          </div>
          {errors.businessName && (
            <p className="form-error">{errors.businessName.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a strong password"
              className={`form-input pl-10 pr-10 ${
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
          {/* Password strength indicator */}
          {password && (
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.level / 5) * 100}%` }}
                  />
                </div>
                <span
                  className={`text-xs font-medium ${
                    passwordStrength.level <= 2
                      ? "text-red-500"
                      : passwordStrength.level <= 3
                      ? "text-yellow-500"
                      : "text-green-500"
                  }`}
                >
                  {passwordStrength.text}
                </span>
              </div>
            </div>
          )}
          {errors.password && (
            <p className="form-error">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="form-label">
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Confirm your password"
              className={`form-input pl-10 pr-10 ${
                errors.confirmPassword
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="form-error">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Terms and Conditions */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="acceptTerms"
              type="checkbox"
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              {...register("acceptTerms")}
            />
          </div>
          <div className="ml-3 text-sm">
            <label
              htmlFor="acceptTerms"
              className="text-gray-700 dark:text-gray-300"
            >
              I agree to the{" "}
              <a
                href="#"
                className="text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium"
              >
                Privacy Policy
              </a>
            </label>
          </div>
        </div>
        {errors.acceptTerms && (
          <p className="form-error -mt-2">{errors.acceptTerms.message}</p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading || isSubmitting}
          className="btn btn-primary btn-lg w-full mobile-btn"
        >
          {isLoading || isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="spinner w-4 h-4 mr-2"></div>
              Creating account...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <UserPlus className="w-5 h-5 mr-2" />
              Create Account
            </div>
          )}
        </button>
      </form>

      {/* Benefits section */}
      <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-700 dark:to-gray-700 rounded-xl border border-primary-100 dark:border-gray-600">
        <p className="text-xs font-semibold text-primary-700 dark:text-primary-300 mb-3">
          What you'll get:
        </p>
        <div className="space-y-2">
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
            <span>Free inventory management tools</span>
          </div>
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
            <span>Track sales, purchases & expenses</span>
          </div>
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
            <span>Works offline with automatic sync</span>
          </div>
          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
            <span>Beautiful reports & insights</span>
          </div>
        </div>
      </div>

      {/* Sign in link */}
      <div className="mt-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
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

export default RegisterPage;
