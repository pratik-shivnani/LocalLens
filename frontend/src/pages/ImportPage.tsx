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
      <h1 className="text-2xl font-bold mb-6">Import Photos</h1>

      {/* Import form */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FolderInput className="w-5 h-5" />
          Import from Source
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    'px-4 py-2 rounded-lg border transition-colors',
                    sourceType === key
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source Path
            </label>
            <input
              type="text"
              value={sourcePath}
              onChange={(e) => setSourcePath(e.target.value)}
              placeholder="/path/to/photos or /path/to/Takeout"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              {sourceType === 'google_takeout'
                ? 'Path to extracted Google Takeout folder'
                : 'Path to folder containing photos and videos'}
            </p>
          </div>

          <button
            onClick={() => importMutation.mutate()}
            disabled={!sourcePath.trim() || importMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Import History</h2>

        {sourcesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : sources && sources.length > 0 ? (
          <div className="divide-y">
            {sources.map((source) => (
              <div key={source.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(source.status)}
                  <div>
                    <div className="font-medium">{source.name}</div>
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
