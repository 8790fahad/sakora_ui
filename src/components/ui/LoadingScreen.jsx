import React from 'react'
import { Smartphone } from 'lucide-react'

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        {/* Logo with animation */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl mx-auto flex items-center justify-center animate-bounce-gentle">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Loading text */}
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Inventria Mobile
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Smart Inventory Management
        </p>

        {/* Loading spinner */}
        <div className="flex items-center justify-center">
          <div className="spinner w-8 h-8"></div>
        </div>

        {/* Loading message */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          {message}
        </p>
      </div>
    </div>
  )
}

export default LoadingScreen

