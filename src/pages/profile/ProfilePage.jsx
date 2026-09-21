import React from "react";
import { User } from "lucide-react";

const ProfilePage = () => {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="text-center py-12">
        <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          User Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Profile management coming soon...
        </p>
      </div>
    </div>
  );
};

export default ProfilePage;

