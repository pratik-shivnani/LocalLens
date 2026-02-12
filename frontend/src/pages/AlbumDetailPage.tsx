import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit2, Trash2, X, Check, ImageOff } from 'lucide-react'
import { albumsApi, photosApi, Photo } from '../lib/api'
import PhotoModal from '../components/PhotoModal'

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const albumId = parseInt(id || '0')

  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const { data: album, isLoading } = useQuery({
    queryKey: ['album', albumId],
    queryFn: () => albumsApi.get(albumId),
    enabled: albumId > 0,
  })

  const updateMutation = useMutation({
    mutationFn: (updates: { name?: string; description?: string }) => 
      albumsApi.update(albumId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['album', albumId] })
      setIsEditing(false)
    },
  })

  const removePhotoMutation = useMutation({
    mutationFn: (photoId: number) => albumsApi.removePhoto(albumId, photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['album', albumId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => albumsApi.delete(albumId),
    onSuccess: () => {
      navigate('/albums')
    },
  })

  const startEditing = () => {
    if (album) {
      setEditName(album.name)
      setEditDescription(album.description || '')
      setIsEditing(true)
    }
  }

  const saveEdit = () => {
    if (editName.trim()) {
      updateMutation.mutate({ name: editName, description: editDescription || undefined })
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="flex-1 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!album) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Album not found</p>
        <Link to="/albums" className="mt-4 text-blue-500 hover:text-blue-600">
          Back to Albums
        </Link>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Link
              to="/albums"
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-2xl font-bold bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-gray-900 dark:text-white"
                  autoFocus
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={2}
                  className="w-full text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{album.name}</h1>
                {album.description && (
                  <p className="text-gray-500 dark:text-gray-400 mt-1">{album.description}</p>
                )}
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}
                </p>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="flex gap-2">
              <button
                onClick={startEditing}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this album? Photos will not be deleted.')) {
                    deleteMutation.mutate()
                  }
                }}
                className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Photos Grid */}
      <div className="flex-1 overflow-auto p-6">
        {album.photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {album.photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 hover:scale-[1.02] transition-all duration-200"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photosApi.getThumbnailUrl(photo.id, 'medium')}
                  alt={photo.file_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                
                {/* Remove from album button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Remove this photo from the album?')) {
                      removePhotoMutation.mutate(photo.id)
                    }
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <ImageOff className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium">No photos in this album</p>
            <p className="text-sm">Add photos from the gallery</p>
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onPrevious={() => {
            const idx = album.photos.findIndex(p => p.id === selectedPhoto.id)
            if (idx > 0) setSelectedPhoto(album.photos[idx - 1])
          }}
          onNext={() => {
            const idx = album.photos.findIndex(p => p.id === selectedPhoto.id)
            if (idx < album.photos.length - 1) setSelectedPhoto(album.photos[idx + 1])
          }}
        />
      )}
    </div>
  )
}
