import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ChevronLeft, ChevronRight, MapPin, Calendar, Camera, Tag, User, FolderPlus, Check, Plus } from 'lucide-react'
import { Photo, photosApi, albumsApi } from '../lib/api'
import { format } from 'date-fns'

interface PhotoModalProps {
  photo: Photo
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
}

export default function PhotoModal({ photo, onClose, onPrevious, onNext }: PhotoModalProps) {
  const queryClient = useQueryClient()
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState('')
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false)

  const { data: photoDetail } = useQuery({
    queryKey: ['photo', photo.id],
    queryFn: () => photosApi.get(photo.id),
  })

  const { data: albums } = useQuery({
    queryKey: ['albums'],
    queryFn: () => albumsApi.list(),
    enabled: showAlbumDropdown,
  })

  const addToAlbumMutation = useMutation({
    mutationFn: (albumId: number) => albumsApi.addPhotos(albumId, [photo.id]),
    onSuccess: (_, albumId) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
      queryClient.invalidateQueries({ queryKey: ['album', albumId] })
      setShowAlbumDropdown(false)
    },
  })

  const createAlbumMutation = useMutation({
    mutationFn: async (name: string) => {
      const album = await albumsApi.create(name)
      await albumsApi.addPhotos(album.id, [photo.id])
      return album
    },
    onSuccess: (album) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
      queryClient.invalidateQueries({ queryKey: ['album', album.id] })
      setNewAlbumName('')
      setIsCreatingAlbum(false)
      setShowAlbumDropdown(false)
    },
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && onPrevious) onPrevious()
      if (e.key === 'ArrowRight' && onNext) onNext()
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onPrevious, onNext])

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/90" onClick={onClose}>
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white transition-colors"
      >
        <X className="w-8 h-8" />
      </button>
      
      {/* Previous button */}
      {onPrevious && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrevious() }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-10 h-10" />
        </button>
      )}
      
      {/* Next button */}
      {onNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white transition-colors"
        >
          <ChevronRight className="w-10 h-10" />
        </button>
      )}
      
      {/* Main content */}
      <div className="flex-1 flex" onClick={(e) => e.stopPropagation()}>
        {/* Image */}
        <div className="flex-1 flex items-center justify-center p-8">
          {photo.is_video ? (
            <video
              src={photosApi.getFileUrl(photo.id)}
              controls
              className="max-h-full max-w-full"
            />
          ) : (
            <img
              src={photosApi.getFileUrl(photo.id)}
              alt={photo.file_name}
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>
        
        {/* Sidebar with details */}
        <div className="w-80 bg-gray-900 text-white p-6 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4 truncate">{photo.file_name}</h2>
          
          {/* Date */}
          {photo.date_taken && (
            <div className="flex items-center gap-2 text-sm text-gray-300 mb-3">
              <Calendar className="w-4 h-4" />
              {format(new Date(photo.date_taken), 'MMMM d, yyyy • h:mm a')}
            </div>
          )}
          
          {/* Location */}
          {photo.location_name && (
            <div className="flex items-start gap-2 text-sm text-gray-300 mb-3">
              <MapPin className="w-4 h-4 mt-0.5" />
              <span>{photo.location_name}</span>
            </div>
          )}
          
          {/* Camera */}
          {photoDetail?.camera_make && (
            <div className="flex items-center gap-2 text-sm text-gray-300 mb-3">
              <Camera className="w-4 h-4" />
              {photoDetail.camera_make} {photoDetail.camera_model}
            </div>
          )}
          
          <hr className="border-gray-700 my-4" />
          
          {/* Tags */}
          {photoDetail?.tags && photoDetail.tags.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" /> Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {photoDetail.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* People */}
          {photoDetail?.people && photoDetail.people.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <User className="w-4 h-4" /> People
              </h3>
              <div className="flex flex-wrap gap-2">
                {photoDetail.people.map((person) => (
                  <span
                    key={person.id}
                    className="px-2 py-1 bg-blue-900 rounded text-xs text-blue-200"
                  >
                    {person.name || `Person ${person.id}`}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <hr className="border-gray-700 my-4" />
          
          {/* Add to Album */}
          <div className="mb-4 relative">
            <button
              onClick={() => setShowAlbumDropdown(!showAlbumDropdown)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              Add to Album
            </button>
            
            {showAlbumDropdown && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto z-10">
                {isCreatingAlbum ? (
                  <div className="p-3">
                    <input
                      type="text"
                      value={newAlbumName}
                      onChange={(e) => setNewAlbumName(e.target.value)}
                      placeholder="Album name..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newAlbumName.trim()) {
                          createAlbumMutation.mutate(newAlbumName.trim())
                        }
                        if (e.key === 'Escape') {
                          setIsCreatingAlbum(false)
                          setNewAlbumName('')
                        }
                      }}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          if (newAlbumName.trim()) {
                            createAlbumMutation.mutate(newAlbumName.trim())
                          }
                        }}
                        disabled={!newAlbumName.trim() || createAlbumMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setIsCreatingAlbum(false)
                          setNewAlbumName('')
                        }}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setIsCreatingAlbum(true)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-blue-400 hover:bg-gray-700/50 border-b border-gray-700"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Album
                    </button>
                    {albums && albums.length > 0 ? (
                      albums.map((album) => (
                        <button
                          key={album.id}
                          onClick={() => addToAlbumMutation.mutate(album.id)}
                          disabled={addToAlbumMutation.isPending}
                          className="w-full flex items-center justify-between px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-700/50 transition-colors"
                        >
                          <span className="truncate">{album.name}</span>
                          <span className="text-xs text-gray-500">{album.photo_count} photos</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500">No albums yet</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          <hr className="border-gray-700 my-4" />
          
          {/* File info */}
          <div className="text-sm text-gray-400 space-y-1">
            <p>Size: {formatFileSize(photoDetail?.file_size ?? null)}</p>
            {photo.width && photo.height && (
              <p>Dimensions: {photo.width} × {photo.height}</p>
            )}
            <p>Type: {photoDetail?.mime_type || 'Unknown'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
