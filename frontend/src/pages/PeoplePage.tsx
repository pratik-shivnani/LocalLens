import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, User, Edit2, Check, X } from 'lucide-react'
import { peopleApi, Person } from '../lib/api'
import PhotoGrid from '../components/PhotoGrid'

export default function PeoplePage() {
  const queryClient = useQueryClient()
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const { data: people, isLoading } = useQuery({
    queryKey: ['people'],
    queryFn: () => peopleApi.list(false, 100),
  })

  const { data: personPhotos, isLoading: photosLoading } = useQuery({
    queryKey: ['person-photos', selectedPerson?.id],
    queryFn: () => peopleApi.getPhotos(selectedPerson!.id),
    enabled: !!selectedPerson,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => peopleApi.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] })
      setEditingId(null)
    },
  })

  const handleStartEdit = (person: Person) => {
    setEditingId(person.id)
    setEditName(person.name || '')
  }

  const handleSaveEdit = (id: number) => {
    if (editName.trim()) {
      updateMutation.mutate({ id, name: editName.trim() })
    }
  }

  return (
    <div className="h-full flex">
      {/* People list sidebar */}
      <div className="w-80 border-r bg-white overflow-auto">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">People</h1>
          <p className="text-sm text-gray-500 mt-1">
            {people?.length || 0} people recognized
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="divide-y">
            {people?.map((person) => (
              <div
                key={person.id}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedPerson?.id === person.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedPerson(person)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    <img
                      src={peopleApi.getFaceThumbnailUrl(person.id, 96)}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                    <User className="w-6 h-6 text-gray-400 hidden" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === person.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSaveEdit(person.id) }}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingId(null) }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {person.name || `Person ${person.id}`}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(person) }}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <span className="text-sm text-gray-500">
                      {person.photo_count} photos
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photos grid */}
      <div className="flex-1 overflow-auto">
        {selectedPerson ? (
          <>
            <div className="p-4 border-b bg-white">
              <h2 className="text-lg font-semibold">
                {selectedPerson.name || `Person ${selectedPerson.id}`}
              </h2>
              <p className="text-sm text-gray-500">
                {personPhotos?.length || 0} photos
              </p>
            </div>
            {photosLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <PhotoGrid photos={personPhotos || []} groupByMonth={false} />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a person to view their photos
          </div>
        )}
      </div>
    </div>
  )
}
