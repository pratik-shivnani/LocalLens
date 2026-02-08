import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Square, Loader2, Zap } from 'lucide-react'
import { processingApi, ProcessingProgress } from '../lib/api'

export default function ProcessingProgressBar() {
  const queryClient = useQueryClient()
  
  const { data: progress, isLoading } = useQuery({
    queryKey: ['processing-progress'],
    queryFn: processingApi.getProgress,
    refetchInterval: (query) => {
      const data = query.state.data as ProcessingProgress | undefined
      return data?.is_running ? 500 : 5000
    },
  })
  
  const { data: status } = useQuery({
    queryKey: ['processing-status'],
    queryFn: processingApi.getStatus,
    refetchInterval: 5000,
  })
  
  const startMutation = useMutation({
    mutationFn: () => processingApi.startContinuous(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processing-progress'] })
    },
  })
  
  const stopMutation = useMutation({
    mutationFn: processingApi.stop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processing-progress'] })
    },
  })
  
  const queueAllMutation = useMutation({
    mutationFn: processingApi.queueAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processing-status'] })
    },
  })
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse h-20 bg-gray-100 rounded" />
      </div>
    )
  }
  
  const isRunning = progress?.is_running ?? false
  const percent = progress?.percent ?? 0
  const queueLength = status?.queue_length ?? 0
  
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Photo Processing
        </h3>
        <div className="flex gap-2">
          {queueLength > 0 && !isRunning && (
            <button
              onClick={() => queueAllMutation.mutate()}
              disabled={queueAllMutation.isPending}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Queue All Unprocessed
            </button>
          )}
          {isRunning ? (
            <button
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          ) : (
            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending || queueLength === 0}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Processing
            </button>
          )}
        </div>
      </div>
      
      {isRunning && (
        <>
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress: {progress?.processed ?? 0} / {progress?.total ?? 0}</span>
              <span>{percent.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          
          {/* Current file info */}
          <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded p-3">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{progress?.current_photo}</div>
              <div className="text-xs text-gray-500">
                Step: {progress?.current_step} • Speed: {progress?.speed?.toFixed(2)} photos/sec
              </div>
            </div>
          </div>
        </>
      )}
      
      {!isRunning && (
        <div className="text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Pending in queue:</span>
            <span className="font-medium">{queueLength}</span>
          </div>
          <div className="flex justify-between">
            <span>Completed:</span>
            <span className="font-medium text-green-600">{status?.completed ?? 0}</span>
          </div>
          {(status?.failed ?? 0) > 0 && (
            <div className="flex justify-between">
              <span>Failed:</span>
              <span className="font-medium text-red-600">{status?.failed}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
