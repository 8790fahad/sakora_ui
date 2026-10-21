import React from "react";

const AuthDivider = ({ label = "or" }) => (
  <div className="relative my-6">
    <div className="absolute inset-0 flex items-center" aria-hidden="true">
      <div className="w-full border-t border-gray-200 dark:border-gray-600" />
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="bg-white dark:bg-gray-800 px-3 text-gray-500 dark:text-gray-400">
        {label}
      </span>
    </div>
  </div>
);

export default AuthDivider;
