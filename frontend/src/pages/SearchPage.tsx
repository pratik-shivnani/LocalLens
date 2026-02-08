import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Sparkles } from 'lucide-react'
import { searchApi } from '../lib/api'
import PhotoGrid from '../components/PhotoGrid'
import SearchBar from '../components/SearchBar'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', submittedQuery],
    queryFn: () => searchApi.semantic(submittedQuery),
    enabled: !!submittedQuery.trim(),
  })

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery)
    setSubmittedQuery(searchQuery)
  }

  const exampleQueries = [
    'Code editor with syntax highlighting',
    'Charts and graphs',
    'Error messages',
    'Terminal or command line',
    'Website or web application',
    'Text documents',
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-white">
        <h1 className="text-2xl font-bold mb-4">Search Photos</h1>
        <SearchBar
          onSearch={handleSearch}
          placeholder="Describe what you're looking for... (e.g., 'photos with a fridge')"
          showFilters
        />
        
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <Sparkles className="w-4 h-4" />
          <span>Powered by AI - search using natural language</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : searchResults && submittedQuery ? (
          <>
            <div className="px-4 pt-4 text-sm text-gray-600">
              Found {searchResults.length} results for "{query}"
            </div>
            <PhotoGrid photos={searchResults} groupByMonth={false} />
          </>
        ) : (
          <div className="p-8">
            <h2 className="text-lg font-medium mb-4">Try searching for:</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {exampleQueries.map((example) => (
                <button
                  key={example}
                  onClick={() => handleSearch(example)}
                  className="p-4 text-left bg-white rounded-lg border hover:border-blue-500 hover:shadow-sm transition-all"
                >
                  <span className="text-gray-700">{example}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
