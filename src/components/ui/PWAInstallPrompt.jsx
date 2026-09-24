import React, { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if user has previously dismissed the prompt
    const promptDismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (promptDismissed) {
      return
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)
      // Show our custom prompt after a short delay
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Remember that user dismissed the prompt
    localStorage.setItem('pwa-prompt-dismissed', 'true')
  }

  // Don't show if already installed or no prompt available
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 lg:bottom-6 lg:left-6 lg:right-auto lg:max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 animate-slide-up">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
          </div>

          <div className="ml-3 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Install sakora Mobile
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Get faster access and work offline by installing our app on your device.
            </p>

            <div className="flex items-center space-x-2 mt-3">
              <button
                onClick={handleInstallClick}
                className="btn btn-primary btn-sm"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="btn btn-outline btn-sm"
              >
                Not now
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="ml-2 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default PWAInstallPrompt

