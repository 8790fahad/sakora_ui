import React, { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
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
  ShieldCheck,
  Gift,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  registerUser,
  verifyEmail,
  resendVerification,
  googleAuth,
  selectAuthLoading,
  selectAuthError,
  clearError,
} from "../../store/slices/authSlice";
import GoogleAuthButton from "../../components/auth/GoogleAuthButton";
import AuthDivider from "../../components/auth/AuthDivider";
import api from "../../services/api";
import {
  SIGNUP_PLANS,
  monthsFromSearch,
  planFromSearch,
  rememberSignupPlan,
  signupBillingPath,
} from "../../utils/billingNext";

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
    .transform((value) => String(value || "").replace(/[\s()-]/g, ""))
    .matches(/^\+?[0-9]{10,15}$/, "Please enter a valid phone number")
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
    .oneOf(
      [true],
      "You must agree to the General Terms of Use, Merchant Terms of Use & General Privacy Policy"
    )
    .required("You must agree to the terms"),
  marketingOptIn: yup.boolean(),
  referralCode: yup
    .string()
    .trim()
    .transform((value) => (value ? value.toUpperCase() : ""))
    .matches(/^$|^[A-Z0-9]{4,16}$/, "Enter a valid referral code"),
});

const verifySchema = yup.object().shape({
  code: yup
    .string()
    .trim()
    .matches(/^\d{6}$/, "Enter the 6-digit code from your email")
    .required("Verification code is required"),
});

const RegisterPage = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const initialReferralCode = (
    searchParams.get("ref") ||
    searchParams.get("referral") ||
    ""
  )
    .trim()
    .toUpperCase();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referrerName, setReferrerName] = useState("");
  const [step, setStep] = useState(
    location.state?.verifyEmail ? "verify" : "register"
  );
  const [pendingEmail, setPendingEmail] = useState(
    location.state?.verifyEmail || ""
  );
  const [resendCooldown, setResendCooldown] = useState(
    location.state?.verifyEmail ? 30 : 0
  );
  const [selectedPlan, setSelectedPlan] = useState(
    () => planFromSearch(location.search) || "growth"
  );

  const chosenPlan =
    SIGNUP_PLANS.find((plan) => plan.key === selectedPlan) || SIGNUP_PLANS[1];
  const money = (amount) => `₦${Number(amount || 0).toLocaleString()}`;

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    const months = monthsFromSearch(location.search);
    const path = signupBillingPath(selectedPlan, months);
    rememberSignupPlan(selectedPlan, months);
    if (searchParams.get("next") === path) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("next", path);
    setSearchParams(nextParams, { replace: true });
  }, [selectedPlan, searchParams, setSearchParams, location.search]);

  useEffect(() => {
    if (!initialReferralCode) return undefined;
    let cancelled = false;
    api.referrals
      .validate(initialReferralCode)
      .then((response) => {
        if (!cancelled) {
          setReferrerName(response?.data?.businessName || "");
        }
      })
      .catch(() => {
        if (!cancelled) setReferrerName("");
      });
    return () => {
      cancelled = true;
    };
  }, [initialReferralCode]);

  useEffect(() => {
    if (location.state?.verifyEmail) {
      setPendingEmail(location.state.verifyEmail);
      setStep("verify");
      setResendCooldown(30);
    }
  }, [location.state]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      acceptTerms: false,
      marketingOptIn: false,
      referralCode: initialReferralCode,
    },
  });

  const {
    register: registerVerify,
    handleSubmit: handleVerifySubmit,
    formState: { errors: verifyErrors, isSubmitting: isVerifying },
    setValue: setVerifyValue,
  } = useForm({
    resolver: yupResolver(verifySchema),
    defaultValues: { code: "" },
  });

  const password = watch("password", "");
  const businessNameValue = watch("businessName", "");
  const marketingOptInValue = watch("marketingOptIn", false);
  const referralCodeValue = watch("referralCode", "");

  const onGoogleCredential = async (idToken) => {
    try {
      dispatch(clearError());
      rememberSignupPlan(selectedPlan);
      const result = await dispatch(
        googleAuth({
          idToken,
          businessName: businessNameValue?.trim() || undefined,
          marketingOptIn: Boolean(marketingOptInValue),
          referralCode: referralCodeValue?.trim() || undefined,
        })
      ).unwrap();
      toast.success(
        result?.isNewUser
          ? "Account created. Welcome to Sakora!"
          : "Welcome back!"
      );
    } catch (err) {
      toast.error(err || "Google sign-up failed. Please try again.");
    }
  };

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
      dispatch(clearError());
      rememberSignupPlan(selectedPlan);

      const nameParts = (data.name || "").trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName =
        nameParts.length > 1
          ? nameParts.slice(1).join(" ")
          : nameParts[0] || "";

      const result = await dispatch(
        registerUser({
          firstName,
          lastName,
          email: data.email.trim().toLowerCase(),
          phone: data.phone,
          password: data.password,
          businessName: data.businessName,
          acceptTerms: true,
          marketingOptIn: Boolean(data.marketingOptIn),
          referralCode: data.referralCode?.trim() || undefined,
        })
      ).unwrap();

      if (result?.requiresVerification) {
        setPendingEmail(result.email || data.email.trim().toLowerCase());
        setStep("verify");
        setResendCooldown(30);
        toast.success("We sent a verification code to your email.");
        return;
      }

      toast.success("Account created successfully! Welcome to sakora!");
    } catch (err) {
      toast.error(err || "Registration failed. Please try again.");
    }
  };

  const onVerify = async ({ code }) => {
    try {
      dispatch(clearError());
      await dispatch(
        verifyEmail({ email: pendingEmail, code: code.trim() })
      ).unwrap();
      toast.success("Email verified. Welcome to Sakora!");
    } catch (err) {
      toast.error(err || "Verification failed. Please try again.");
    }
  };

  const onResend = async () => {
    if (resendCooldown > 0 || !pendingEmail) return;
    try {
      await dispatch(resendVerification({ email: pendingEmail })).unwrap();
      setResendCooldown(30);
      toast.success("A new code has been sent.");
    } catch (err) {
      toast.error(err || "Could not resend code. Please try again.");
    }
  };

  if (step === "verify") {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Verify your email
          </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enter the 6-digit code we sent to{" "}
            <span className="font-medium text-gray-900 dark:text-white">
              {pendingEmail}
            </span>
            . After that you choose 1, 12, 24, or 48 months for {chosenPlan.name}.
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

        <form onSubmit={handleVerifySubmit(onVerify)} className="space-y-5">
          <div>
            <label htmlFor="code" className="form-label">
              Verification code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className={`form-input text-center text-2xl tracking-[0.4em] font-semibold ${
                verifyErrors.code
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : ""
              }`}
              {...registerVerify("code", {
                onChange: (event) => {
                  const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                  setVerifyValue("code", next, { shouldValidate: true });
                },
              })}
            />
            {verifyErrors.code && (
              <p className="form-error">{verifyErrors.code.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || isVerifying}
            className="btn btn-primary btn-lg w-full mobile-btn"
          >
            {isLoading || isVerifying ? (
              <div className="flex items-center justify-center">
                <div className="spinner w-4 h-4 mr-2"></div>
                Verifying...
              </div>
            ) : (
              "Verify and pay"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            Didn&apos;t get the code?{" "}
            <button
              type="button"
              onClick={onResend}
              disabled={resendCooldown > 0 || isLoading}
              className="font-semibold text-primary-600 hover:text-primary-500 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </p>
          <button
            type="button"
            onClick={() => {
              setStep("register");
              dispatch(clearError());
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
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Create Account
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Choose a plan, create the shop, then pay with Squad. Longer terms cost less per month.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {SIGNUP_PLANS.map((plan) => (
          <button
            key={plan.key}
            type="button"
            onClick={() => setSelectedPlan(plan.key)}
            className={`rounded-xl border px-3 py-3 text-left ${
              selectedPlan === plan.key
                ? "border-teal-600 bg-teal-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <span className="block text-sm font-semibold text-gray-900">
              {plan.name}
            </span>
            <span className="block text-xs text-gray-500">
              {money(plan.price)}/mo
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      <GoogleAuthButton
        onCredential={onGoogleCredential}
        text="signup_with"
        disabled={isLoading}
        label="Sign up with Google"
      />
      <p className="mt-3 text-xs text-center text-gray-500 dark:text-gray-400 leading-relaxed">
        By continuing with Google, you agree to Sakora&apos;s{" "}
        <Link to="/legal/terms" target="_blank" className="text-primary-600 hover:text-primary-500">
          Terms
        </Link>
        ,{" "}
        <Link
          to="/legal/merchant-terms"
          target="_blank"
          className="text-primary-600 hover:text-primary-500"
        >
          Merchant Terms
        </Link>{" "}
        &amp;{" "}
        <Link to="/legal/privacy" target="_blank" className="text-primary-600 hover:text-primary-500">
          Privacy Policy
        </Link>
        .
      </p>
      <AuthDivider label="or create with email" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            {errors.email && (
              <p className="form-error">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="form-label">
              Phone number
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
            {errors.phone && (
              <p className="form-error">{errors.phone.message}</p>
            )}
          </div>

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
            {password && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{
                        width: `${(passwordStrength.level / 5) * 100}%`,
                      }}
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

          <div className="sm:col-span-2">
            <label htmlFor="referralCode" className="form-label">
              Referral code{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Gift className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="referralCode"
                type="text"
                autoComplete="off"
                placeholder="Enter a friend's code"
                className={`form-input pl-10 uppercase tracking-wider ${
                  errors.referralCode
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : ""
                }`}
                {...register("referralCode")}
              />
            </div>
            {referrerName && (
              <p className="mt-1 text-xs text-teal-700">
                Referred by {referrerName}
              </p>
            )}
            {errors.referralCode && (
              <p className="form-error">{errors.referralCode.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              id="acceptTerms"
              type="checkbox"
              className="mt-1 w-4 h-4 accent-teal-600 border-gray-300 rounded focus:ring-teal-500"
              {...register("acceptTerms")}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              I agree to the{" "}
              <Link
                to="/legal/terms"
                target="_blank"
                rel="noreferrer"
                className="text-primary-600 hover:text-primary-500 font-medium"
                onClick={(event) => event.stopPropagation()}
              >
                General Terms of Use
              </Link>
              ,{" "}
              <Link
                to="/legal/merchant-terms"
                target="_blank"
                rel="noreferrer"
                className="text-primary-600 hover:text-primary-500 font-medium"
                onClick={(event) => event.stopPropagation()}
              >
                Merchant Terms of Use
              </Link>{" "}
              &amp;{" "}
              <Link
                to="/legal/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-primary-600 hover:text-primary-500 font-medium"
                onClick={(event) => event.stopPropagation()}
              >
                General Privacy Policy
              </Link>{" "}
              of Sakora
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="form-error">{errors.acceptTerms.message}</p>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              id="marketingOptIn"
              type="checkbox"
              className="mt-1 w-4 h-4 accent-teal-600 border-gray-300 rounded focus:ring-teal-500"
              {...register("marketingOptIn")}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              I&apos;ll like to receive marketing communication and business tips
              from Sakora.
            </span>
          </label>
        </div>

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

      <div className="mt-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <Link
            to={`/login${location.search}`}
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
