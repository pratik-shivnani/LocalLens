import { useQuery } from '@tanstack/react-query'
import { HardDrive, Cpu, Database, Image, Users, Tag } from 'lucide-react'
import { processingApi } from '../lib/api'
import ProcessingProgressBar from '../components/ProcessingProgress'

export default function SettingsPage() {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: processingApi.getStats,
  })

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Processing */}
      <div className="mb-6">
        <ProcessingProgressBar />
      </div>

      {/* Library Stats */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Library Statistics
        </h2>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Image className="w-4 h-4" />
                <span className="text-sm">Photos</span>
              </div>
              <div className="text-2xl font-bold">{stats.total_photos.toLocaleString()}</div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Image className="w-4 h-4" />
                <span className="text-sm">Videos</span>
              </div>
              <div className="text-2xl font-bold">{stats.total_videos.toLocaleString()}</div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm">People</span>
              </div>
              <div className="text-2xl font-bold">{stats.total_people.toLocaleString()}</div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Tag className="w-4 h-4" />
                <span className="text-sm">Tags</span>
              </div>
              <div className="text-2xl font-bold">{stats.total_tags.toLocaleString()}</div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <HardDrive className="w-4 h-4" />
                <span className="text-sm">Storage</span>
              </div>
              <div className="text-2xl font-bold">{formatBytes(stats.storage_size_bytes)}</div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Cpu className="w-4 h-4" />
                <span className="text-sm">Processed</span>
              </div>
              <div className="text-2xl font-bold">
                {stats.processed_count} / {stats.processed_count + stats.unprocessed_count}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Configuration</h2>
        <p className="text-gray-500 text-sm mb-4">
          Edit the <code className="bg-gray-100 px-1 rounded">.env</code> file in the backend directory to configure:
        </p>
        
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-gray-50 rounded">
            <code className="font-mono text-blue-600">PHOTOS_LIBRARY_PATH</code>
            <p className="text-gray-600 mt-1">Path to your photos library</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <code className="font-mono text-blue-600">DEVICE</code>
            <p className="text-gray-600 mt-1">ML device: mps (Apple Silicon), cuda (NVIDIA), or cpu</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <code className="font-mono text-blue-600">BATCH_SIZE</code>
            <p className="text-gray-600 mt-1">Number of photos to process in each batch</p>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">About</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Photo Organiser</strong> v0.1.0</p>
          <p>A local ML-powered photo management application.</p>
          <p className="pt-2">
            Features:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Face and pet recognition</li>
            <li>Automatic scene and object tagging</li>
            <li>Natural language search (CLIP)</li>
            <li>Location extraction and reverse geocoding</li>
            <li>Google Photos Takeout import</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
