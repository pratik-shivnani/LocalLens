import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FolderInput, Upload, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { importApi } from '../lib/api'
import { clsx } from 'clsx'
import ProcessingProgressBar from '../components/ProcessingProgress'

export default function ImportPage() {
  const queryClient = useQueryClient()
  const [sourcePath, setSourcePath] = useState('')
  const [sourceType, setSourceType] = useState<'folder' | 'google_takeout'>('folder')

  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ['import-sources'],
    queryFn: importApi.listSources,
  })

  const importMutation = useMutation({
    mutationFn: () => importApi.start(sourcePath, sourceType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-sources'] })
      setSourcePath('')
    },
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Import Photos</h1>

      {/* Import form */}
      <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 p-6 mb-6 transition-colors duration-200">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FolderInput className="w-5 h-5 text-blue-500" />
          Import from Source
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Source Type
            </label>
            <div className="flex gap-2">
              {[
                { key: 'folder', label: 'Folder / USB Drive' },
                { key: 'google_takeout', label: 'Google Photos Takeout' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSourceType(key as typeof sourceType)}
                  className={clsx(
                    'px-4 py-2 rounded-xl border transition-all',
                    sourceType === key
                      ? 'border-blue-500 bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Source Path
            </label>
            <input
              type="text"
              value={sourcePath}
              onChange={(e) => setSourcePath(e.target.value)}
              placeholder="/path/to/photos or /path/to/Takeout"
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-2 text-sm text-gray-500">
              {sourceType === 'google_takeout'
                ? 'Path to extracted Google Takeout folder'
                : 'Path to folder containing photos and videos'}
            </p>
          </div>

          <button
            onClick={() => importMutation.mutate()}
            disabled={!sourcePath.trim() || importMutation.isPending}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {importMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Start Import
          </button>
        </div>
      </div>

      {/* Processing status */}
      <div className="mb-6">
        <ProcessingProgressBar />
      </div>

      {/* Import history */}
      <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 p-6 transition-colors duration-200">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Import History</h2>

        {sourcesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : sources && sources.length > 0 ? (
          <div className="space-y-2">
            {sources.map((source) => (
              <div key={source.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between transition-colors duration-200">
                <div className="flex items-center gap-3">
                  {getStatusIcon(source.status)}
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{source.name}</div>
                    <div className="text-sm text-gray-500">
                      {source.source_type} • {source.photo_count} photos
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(source.date_imported).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No imports yet</p>
        )}
      </div>
    </div>
  )
}
