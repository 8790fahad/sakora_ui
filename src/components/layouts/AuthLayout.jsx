import React from "react";
import { Link } from "react-router-dom";
import { Shield, Zap, BarChart3 } from "lucide-react";

const websiteUrl = import.meta.env.VITE_WEBSITE_URL || "http://localhost:5174";

const AuthLayout = ({ children, wide = false }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex flex-col lg:flex-row">
      {/* Left side - Hero section (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] lg:flex-col lg:justify-center lg:px-12 xl:px-16 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="max-w-md">
          <div className="flex items-center mb-8">
            <div className="flex-shrink-0">
              <img src="/brand-white.svg" alt="" className="w-12 h-12" />
            </div>
            <div className="ml-4">
              <h1 className="text-3xl font-bold">Sakora</h1>
              <p className="text-primary-100">Website, WhatsApp sales & inventory</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Run your business
            <span className="text-primary-200"> from your phone</span>
          </h2>

          <p className="text-xl text-primary-100 mb-12 leading-relaxed">
            Get a shop link, sell on WhatsApp, record sales, collect payments with Squad, and keep stock in one app.
          </p>

          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Shield className="w-6 h-6 text-primary-200 mt-1" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold mb-1">WhatsApp selling</h3>
                <p className="text-primary-100 text-sm">
                  Share products and invoices with customers in one tap
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Zap className="w-6 h-6 text-primary-200 mt-1" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold mb-1">Online shop</h3>
                <p className="text-primary-100 text-sm">
                  Get a shop link customers can browse and pay on
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-primary-200 mt-1" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold mb-1">Stock & sales</h3>
                <p className="text-primary-100 text-sm">
                  Record sales, track inventory, and see how the business is doing
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex flex-col justify-center px-4 py-8 sm:px-8 lg:px-10 xl:px-16">
        <div
          className={`mx-auto w-full ${
            wide ? "max-w-3xl" : "max-w-sm lg:max-w-md"
          }`}
        >
          {/* Mobile logo */}
          <div className="flex items-center justify-center mb-6 lg:hidden">
            <div className="flex items-center">
              <img src="/brand.svg" alt="" className="w-10 h-10" />
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  sakora Mobile
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Smart Inventory Management
                </p>
              </div>
            </div>
          </div>

          {/* Auth form content */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
            {children}
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>
              <a href={websiteUrl} className="hover:text-primary-600">
                Back to Sakora
              </a>
            </p>
            <p className="text-xs">
              <Link to="/legal/terms" className="hover:text-primary-600">
                Terms of Use
              </Link>
              {" · "}
              <Link to="/legal/merchant-terms" className="hover:text-primary-600">
                Merchant Terms
              </Link>
              {" · "}
              <Link to="/legal/privacy" className="hover:text-primary-600">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
