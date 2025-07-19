import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search } from 'lucide-react';
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

interface GlobalSearchProps {
  onSelectResult?: (promptUuid: string) => void;
}

export function GlobalSearch({ onSelectResult }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Cmd/Ctrl + F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setResults(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !results?.hits.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.hits.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results.hits[selectedIndex]) {
            handleSelectResult(results.hits[selectedIndex].uuid);
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, results, selectedIndex]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 3) {
      setResults(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Parse the search query to handle advanced syntax
        const parsedQuery = parseSearchQuery(query.trim());
        console.log('Original query:', query.trim());
        console.log('Parsed query:', parsedQuery);
        console.log('FTS query being sent:', parsedQuery.ftsQuery);
        
        const searchResults = await invoke<SearchResults>('search_prompts', {
          query: parsedQuery.ftsQuery,
          limit: 5, // Show top 5 results in autocomplete
          offset: 0,
        });
        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search failed:', error);
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelectResult = (promptUuid: string) => {
    setIsOpen(false);
    setQuery('');
    setResults(null);
    if (onSelectResult) {
      onSelectResult(promptUuid);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleClickOutside = (e: React.MouseEvent) => {
    if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Search Input */}
      <div className="relative w-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleInputFocus}
            placeholder="Search prompts... (min 3 chars, ⌘F)"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Search Results Dropdown */}
        {isOpen && (query.trim().length >= 3 || isLoading) && (
          <div 
            ref={resultsRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 
                     border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
          >
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                Searching...
              </div>
            ) : results?.hits.length ? (
              <>
                {results.hits.map((hit, index) => (
                  <div
                    key={hit.uuid}
                    onClick={() => handleSelectResult(hit.uuid)}
                    className={`p-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0
                              ${index === selectedIndex 
                                ? 'bg-blue-50 dark:bg-blue-900/20' 
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {hit.title}
                    </div>
                    <div 
                      className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: hit.snippet }}
                    />
                  </div>
                ))}
                {results.total_count > results.hits.length && (
                  <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
                    {results.total_count - results.hits.length} more results...
                  </div>
                )}
              </>
            ) : query.trim().length >= 3 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No results found for "{query}"
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
          onClick={handleClickOutside}
        />
      )}
    </>
  );
}