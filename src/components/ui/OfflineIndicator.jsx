import React from 'react'
import { useSelector } from 'react-redux'
import { WifiOff, Wifi } from 'lucide-react'
import { selectIsOnline, selectPendingOperationsCount } from '../../store/slices/syncSlice'

const OfflineIndicator = () => {
  const isOnline = useSelector(selectIsOnline)
  const pendingCount = useSelector(selectPendingOperationsCount)

  if (isOnline && pendingCount === 0) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className={`px-4 py-2 text-center text-sm font-medium ${
        isOnline
          ? 'bg-warning-500 text-white'
          : 'bg-red-500 text-white'
      }`}>
        <div className="flex items-center justify-center space-x-2">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              <span>
                {pendingCount > 0 && `${pendingCount} changes waiting to sync`}
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span>No internet connection - working offline</span>
              {pendingCount > 0 && (
                <span className="ml-1">({pendingCount} pending changes)</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default OfflineIndicator

