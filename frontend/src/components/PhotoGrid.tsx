import { useState, useMemo } from 'react'
import { Play, MapPin, Calendar } from 'lucide-react'
import { Photo, photosApi } from '../lib/api'
import PhotoModal from './PhotoModal'
import { format, parseISO } from 'date-fns'

interface PhotoGridProps {
  photos: Photo[]
  loading?: boolean
  groupByMonth?: boolean
}

interface MonthGroup {
  key: string
  label: string
  photos: Photo[]
}

function extractDateFromFilename(filename: string): Date | null {
  // Try to extract date from filename patterns like "Screenshot 2025-10-08" or "IMG_20231118"
  const patterns = [
    /(\d{4})-(\d{2})-(\d{2})/,           // 2025-10-08
    /(\d{4})(\d{2})(\d{2})/,             // 20231118
    /(\d{4})_(\d{2})_(\d{2})/,           // 2024_01_23
  ]
  
  for (const pattern of patterns) {
    const match = filename.match(pattern)
    if (match) {
      const [, year, month, day] = match
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      if (!isNaN(date.getTime()) && parseInt(year) > 1990 && parseInt(year) < 2100) {
        return date
      }
    }
  }
  return null
}

function groupPhotosByMonth(photos: Photo[]): MonthGroup[] {
  const groups: Record<string, Photo[]> = {}
  
  photos.forEach(photo => {
    let date: Date
    if (photo.date_taken) {
      date = new Date(photo.date_taken)
    } else {
      // Try to extract date from filename
      const extractedDate = extractDateFromFilename(photo.file_name)
      date = extractedDate || new Date() // Fallback to current date
    }
    const key = format(date, 'yyyy-MM')
    
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(photo)
  })
  
  // Sort by date descending (newest first)
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, photos]) => ({
      key,
      label: format(parseISO(key + '-01'), 'MMMM yyyy'),
      photos
    }))
}

export default function PhotoGrid({ photos, loading, groupByMonth = true }: PhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  
  const monthGroups = useMemo(() => 
    groupByMonth ? groupPhotosByMonth(photos) : null,
    [photos, groupByMonth]
  )

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-200 dark:bg-gray-800/50 rounded-xl animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <p className="text-lg font-medium">No photos found</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">Import some photos to get started</p>
      </div>
    )
  }

  const renderPhoto = (photo: Photo) => (
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
      
      {/* Video indicator */}
      {photo.is_video && (
        <div className="absolute top-2 right-2 bg-black/70 rounded-full p-1">
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
      )}
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors">
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-xs truncate">{photo.file_name}</p>
          {photo.date_taken && (
            <p className="text-white/70 text-xs flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(photo.date_taken), 'MMM d, yyyy')}
            </p>
          )}
          {photo.location_name && (
            <p className="text-white/70 text-xs flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3" />
              {photo.city || photo.country || photo.location_name}
            </p>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {groupByMonth && monthGroups ? (
        <div>
          {monthGroups.map((group, index) => (
            <section key={group.key}>
              {/* Month divider with clear visual separation */}
              {index > 0 && (
                <div className="py-4 px-6">
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                </div>
              )}
              <div className="px-6 py-4 bg-gray-100 dark:bg-gray-800/30 border-l-4 border-blue-500 transition-colors duration-200">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{group.label}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{group.photos.length} photos</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
                {group.photos.map(renderPhoto)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 p-4">
          {photos.map(renderPhoto)}
        </div>
      )}
      
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onPrevious={() => {
            const idx = photos.findIndex(p => p.id === selectedPhoto.id)
            if (idx > 0) setSelectedPhoto(photos[idx - 1])
          }}
          onNext={() => {
            const idx = photos.findIndex(p => p.id === selectedPhoto.id)
            if (idx < photos.length - 1) setSelectedPhoto(photos[idx + 1])
          }}
        />
      )}
    </>
  )
}
