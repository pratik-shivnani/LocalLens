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
      <div className="p-6 border-b border-gray-200 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gallery</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your memories, organized by AI</p>
          </div>
          {stats && (
            <div className="flex items-center gap-4 text-sm">
              <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <span className="text-blue-600 dark:text-blue-400 font-medium">{stats.total_photos}</span>
                <span className="text-gray-500 ml-1">photos</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <span className="text-purple-600 dark:text-purple-400 font-medium">{stats.total_videos}</span>
                <span className="text-gray-500 ml-1">videos</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatStorage(stats.storage_size_bytes)}</span>
              </div>
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
                'px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-200 font-medium',
                filter === key && !selectedTagId
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700/50'
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
                'px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-200 font-medium',
                selectedTagId
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700/50'
              )}
            >
              <Tag className="w-4 h-4" />
              {selectedTag ? selectedTag.name : 'Filter by Tag'}
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showTagDropdown && (
              <div className="absolute top-full left-0 mt-2 w-64 max-h-80 overflow-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700/50 z-50">
                <button
                  onClick={() => { setSelectedTagId(null); setShowTagDropdown(false) }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700/50"
                >
                  All (no filter)
                </button>
                {tags?.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => { setSelectedTagId(tag.id); setShowTagDropdown(false) }}
                    className={clsx(
                      'w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 flex justify-between items-center text-gray-700 dark:text-gray-300',
                      selectedTagId === tag.id && 'bg-purple-500/10'
                    )}
                  >
                    <span>{tag.name}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-full">{tag.photo_count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Clear tag filter */}
          {selectedTagId && (
            <button
              onClick={() => setSelectedTagId(null)}
              className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
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
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            <PhotoGrid photos={photos || []} />
            {/* Infinite scroll trigger - inside scrollable area */}
            <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
              {isFetchingNextPage && (
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              )}
              {!hasNextPage && photos.length > 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-600">End of gallery</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
