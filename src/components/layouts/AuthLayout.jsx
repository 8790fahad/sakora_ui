import React from "react";
import { Smartphone, Shield, Zap, BarChart3 } from "lucide-react";

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex flex-col lg:flex-row">
      {/* Left side - Hero section (hidden on mobile) */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-20 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="max-w-md">
          <div className="flex items-center mb-8">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
            </div>
            <div className="ml-4">
              <h1 className="text-3xl font-bold">Inventria Mobile</h1>
              <p className="text-primary-100">Smart Inventory Management</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Manage your business
            <span className="text-primary-200"> on the go</span>
          </h2>

          <p className="text-xl text-primary-100 mb-12 leading-relaxed">
            Simple, fast, and intuitive inventory management designed for small
            businesses. Track sales, manage stock, and grow your business from
            anywhere.
          </p>

          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Shield className="w-6 h-6 text-primary-200 mt-1" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold mb-1">Secure & Reliable</h3>
                <p className="text-primary-100 text-sm">
                  Your business data is protected with enterprise-grade security
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Zap className="w-6 h-6 text-primary-200 mt-1" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold mb-1">Lightning Fast</h3>
                <p className="text-primary-100 text-sm">
                  Optimized for speed with offline capability and instant sync
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-primary-200 mt-1" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold mb-1">Smart Analytics</h3>
                <p className="text-primary-100 text-sm">
                  Get insights into your business with detailed reports and
                  charts
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Inventria Mobile
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Smart Inventory Management
                </p>
              </div>
            </div>
          </div>

          {/* Auth form content */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
            {children}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Made with ❤️ for small businesses</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;

