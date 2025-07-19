import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useNavigate } from 'react-router-dom';
import { Search, Clock } from 'lucide-react';
import { parseSearchQuery } from '../../services/searchParser';

interface SearchHit {
  uuid: string;
  title: string;
  snippet: string;
  rank: number;
}

interface SearchResults {
  hits: SearchHit[];
  total_count: number;
  query: string;
}

interface SearchResultsProps {
  initialQuery?: string;
}

export function SearchResults({ initialQuery = '' }: SearchResultsProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  
  const RESULTS_PER_PAGE = 20;

  // Search function
  const performSearch = async (searchQuery: string, page: number = 1) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    try {
      const offset = (page - 1) * RESULTS_PER_PAGE;
      // Parse the search query to handle advanced syntax
      const parsedQuery = parseSearchQuery(searchQuery.trim());
      console.log('Parsed query:', parsedQuery); // Debug log
      
      const searchResults = await invoke<SearchResults>('search_prompts', {
        query: parsedQuery.ftsQuery,
        limit: RESULTS_PER_PAGE,
        offset,
      });
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial search
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, 1);
    }
  }, [initialQuery]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    performSearch(query, 1);
  };

  // Handle result click
  const handleResultClick = (promptUuid: string) => {
    // Navigate to editor screen
    navigate(`/editor/${promptUuid}`);
  };

  // Pagination
  const totalPages = results ? Math.ceil(results.total_count / RESULTS_PER_PAGE) : 0;
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    performSearch(query, page);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Search Prompts
        </h1>
        
        {/* Search Form */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for prompts, tags, content... (min 3 characters)"
              className="w-full pl-12 pr-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                       placeholder-gray-500 dark:placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 
                     bg-blue-600 text-white rounded-md hover:bg-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Search Tips */}
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <span className="mr-4">Tips: Try "marketing prompts" or "tag:coding"</span>
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">⌘F</kbd>
          <span className="ml-1">for quick search</span>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Searching prompts...</p>
        </div>
      )}

      {/* Results */}
      {results && !isLoading && (
        <>
          {/* Results Summary */}
          <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
            {results.total_count > 0 ? (
              <>
                Found <span className="font-semibold">{results.total_count}</span> result
                {results.total_count !== 1 ? 's' : ''} for "
                <span className="font-semibold">{results.query}</span>"
                {totalPages > 1 && (
                  <span className="ml-2">
                    (Page {currentPage} of {totalPages})
                  </span>
                )}
              </>
            ) : (
              <>No results found for "<span className="font-semibold">{results.query}</span>"</>
            )}
          </div>

          {/* Results List */}
          {results.hits.length > 0 ? (
            <div className="space-y-4">
              {results.hits.map((hit) => (
                <div
                  key={hit.uuid}
                  onClick={() => handleResultClick(hit.uuid)}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 
                           hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors
                           hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400">
                    {hit.title}
                  </h3>
                  <div 
                    className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: hit.snippet.replace(/<mark>/g, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">') 
                    }}
                  />
                  <div className="mt-3 flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3 mr-1" />
                    Relevance: {(1 / (hit.rank + 1) * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="text-center py-12">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No results found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try different keywords or check your spelling
              </p>
            </div>
          ) : null}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                         hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm border rounded-md ${
                      page === currentPage
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                         hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}