import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Sparkles, Search, Wand2 } from 'lucide-react'
import { searchApi } from '../lib/api'
import PhotoGrid from '../components/PhotoGrid'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', submittedQuery],
    queryFn: () => searchApi.semantic(submittedQuery),
    enabled: !!submittedQuery.trim(),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittedQuery(query)
  }

  const exampleQueries = [
    { text: 'Photos at the beach', icon: '🏖️' },
    { text: 'Birthday celebrations', icon: '🎂' },
    { text: 'Food and meals', icon: '🍽️' },
    { text: 'Pets and animals', icon: '🐕' },
    { text: 'Nature and landscapes', icon: '🌄' },
    { text: 'Group photos', icon: '👥' },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm transition-colors duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Search</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Find photos using natural language</p>
          </div>
        </div>
        
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe what you're looking for..."
            className="w-full pl-12 pr-4 py-4 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </form>
        
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          <span>Powered by CLIP AI - understands context and meaning</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : searchResults && submittedQuery ? (
          <>
            <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800/50">
              Found <span className="text-purple-600 dark:text-purple-400 font-medium">{searchResults.length}</span> results for "<span className="text-gray-900 dark:text-white">{submittedQuery}</span>"
            </div>
            <PhotoGrid photos={searchResults} groupByMonth={false} />
          </>
        ) : (
          <div className="p-8">
            <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">Try searching for:</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {exampleQueries.map((example) => (
                <button
                  key={example.text}
                  onClick={() => { setQuery(example.text); setSubmittedQuery(example.text) }}
                  className="p-4 text-left bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 hover:border-purple-500/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                >
                  <span className="text-2xl mb-2 block">{example.icon}</span>
                  <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{example.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
