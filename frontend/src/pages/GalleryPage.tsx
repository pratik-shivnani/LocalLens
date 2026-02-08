import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { Image, Film, Loader2, Tag, X, ChevronDown } from 'lucide-react'
import { photosApi, processingApi, tagsApi, Photo } from '../lib/api'
import PhotoGrid from '../components/PhotoGrid'
import { clsx } from 'clsx'

type MediaFilter = 'all' | 'photos' | 'videos'

export default function GalleryPage() {
  const [filter, setFilter] = useState<MediaFilter>('all')
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null)
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const limit = 50
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['photos-infinite', filter, selectedTagId],
    queryFn: async ({ pageParam = 0 }) => {
      if (selectedTagId) {
        const response = await fetch(`/api/tags/${selectedTagId}/photos?limit=${limit}&offset=${pageParam}`)
        return response.json() as Promise<Photo[]>
      }
      const isVideo = filter === 'videos' ? true : filter === 'photos' ? false : undefined
      return photosApi.list(limit, pageParam, isVideo)
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < limit) return undefined
      return allPages.length * limit
    },
    initialPageParam: 0,
  })

  const photos = data?.pages.flat() || []

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: processingApi.getStats,
  })

  const selectedTag = tags?.find(t => t.id === selectedTagId)

  // Intersection Observer for infinite scroll
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries
    if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [handleObserver])

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(1)} GB`
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Gallery</h1>
          {stats && (
            <div className="text-sm text-gray-500">
              {stats.total_photos} photos • {stats.total_videos} videos • {formatStorage(stats.storage_size_bytes)}
            </div>
          )}
        </div>
        
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap items-center">
          {[
            { key: 'all', label: 'All', icon: null },
            { key: 'photos', label: 'Photos', icon: Image },
            { key: 'videos', label: 'Videos', icon: Film },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setFilter(key as MediaFilter); setSelectedTagId(null) }}
              className={clsx(
                'px-4 py-2 rounded-lg flex items-center gap-2 transition-colors',
                filter === key && !selectedTagId
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {label}
            </button>
          ))}
          
          {/* Tag filter dropdown */}
          <div className="relative ml-2">
            <button
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className={clsx(
                'px-4 py-2 rounded-lg flex items-center gap-2 transition-colors',
                selectedTagId
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              <Tag className="w-4 h-4" />
              {selectedTag ? selectedTag.name : 'Filter by Tag'}
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showTagDropdown && (
              <div className="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-auto bg-white rounded-lg shadow-lg border z-50">
                <button
                  onClick={() => { setSelectedTagId(null); setShowTagDropdown(false) }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-600"
                >
                  All (no filter)
                </button>
                {tags?.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => { setSelectedTagId(tag.id); setShowTagDropdown(false) }}
                    className={clsx(
                      'w-full px-4 py-2 text-left hover:bg-gray-100 flex justify-between items-center',
                      selectedTagId === tag.id && 'bg-purple-50'
                    )}
                  >
                    <span>{tag.name}</span>
                    <span className="text-xs text-gray-400">{tag.photo_count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Clear tag filter */}
          {selectedTagId && (
            <button
              onClick={() => setSelectedTagId(null)}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <PhotoGrid photos={photos || []} />
            {/* Infinite scroll trigger - inside scrollable area */}
            <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
              {isFetchingNextPage && (
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              )}
              {!hasNextPage && photos.length > 0 && (
                <span className="text-sm text-gray-400">End of gallery</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
