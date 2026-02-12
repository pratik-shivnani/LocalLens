import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, FolderOpen, Trash2, Edit2, X, Check } from 'lucide-react'
import { Album, albumsApi, photosApi } from '../lib/api'

export default function AlbumsPage() {
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState('')
  const [newAlbumDescription, setNewAlbumDescription] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const { data: albums, isLoading } = useQuery({
    queryKey: ['albums'],
    queryFn: () => albumsApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: () => albumsApi.create(newAlbumName, newAlbumDescription || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
      setIsCreating(false)
      setNewAlbumName('')
      setNewAlbumDescription('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => albumsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => albumsApi.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
      setEditingId(null)
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (newAlbumName.trim()) {
      createMutation.mutate()
    }
  }

  const startEditing = (album: Album) => {
    setEditingId(album.id)
    setEditName(album.name)
  }

  const saveEdit = (id: number) => {
    if (editName.trim()) {
      updateMutation.mutate({ id, name: editName })
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Albums</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {albums?.length || 0} albums
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Album
          </button>
        </div>
      </div>

      {/* Create Album Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create New Album</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Album Name
                  </label>
                  <input
                    type="text"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="My Album"
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newAlbumDescription}
                    onChange={(e) => setNewAlbumDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false)
                    setNewAlbumName('')
                    setNewAlbumDescription('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newAlbumName.trim() || createMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl transition-colors"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : albums && albums.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {albums.map((album) => (
              <div
                key={album.id}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-lg"
              >
                <Link to={`/albums/${album.id}`} className="block">
                  {/* Cover Image */}
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
                    {album.cover_photo_id ? (
                      <img
                        src={photosApi.getThumbnailUrl(album.cover_photo_id, 'medium')}
                        alt={album.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FolderOpen className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                  </div>
                  
                  {/* Album Info */}
                  <div className="p-4">
                    {editingId === album.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(album.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                        <button
                          onClick={() => saveEdit(album.id)}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {album.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}
                        </p>
                      </>
                    )}
                  </div>
                </Link>

                {/* Actions */}
                {editingId !== album.id && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        startEditing(album)
                      }}
                      className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        if (confirm('Delete this album? Photos will not be deleted.')) {
                          deleteMutation.mutate(album.id)
                        }
                      }}
                      className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <FolderOpen className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium">No albums yet</p>
            <p className="text-sm">Create an album to organize your photos</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Album
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
