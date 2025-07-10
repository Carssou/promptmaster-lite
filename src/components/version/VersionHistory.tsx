import { useState, useEffect, useCallback, memo } from 'react';
import { Clock, GitBranch, RotateCcw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { usePerformanceMonitor, PerformanceProfiler } from '../../hooks/usePerformanceMonitor';
import { VersionItemSkeleton } from '../ui/Skeleton';

interface Version {
  uuid: string;
  semver: string;
  created_at: string;
  body: string;
  isLatest: boolean;
}


interface BackendVersion {
  uuid: string;
  prompt_uuid: string;
  semver: string;
  body: string;
  metadata?: string;
  created_at: string;
  parent_uuid?: string;
}

interface VersionHistoryProps {
  promptUuid: string;
  currentVersion?: string;
  onVersionSelect: (version: Version) => void;
  onVersionDiff: (versionA: Version, versionB: Version) => void;
  onVersionRollback: (version: Version) => void;
  className?: string;
  height?: number;
}


function VersionHistoryComponent({ 
  promptUuid, 
  currentVersion,
  onVersionSelect,
  onVersionDiff,
  onVersionRollback,
  className = '',
  height = 400
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState<Version[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rollbackConfirmation, setRollbackConfirmation] = useState<{
    version: Version;
    show: boolean;
  } | null>(null);
  
  // Performance monitoring
  usePerformanceMonitor('VersionHistory');

  // Load versions from backend using optimized single query
  useEffect(() => {
    let isCancelled = false;
    
    const loadVersions = async () => {
      if (isCancelled) return;
      
      try {
        setLoading(true);
        
        // Use optimized single query to get all version data at once
        const backendVersions = await invoke<BackendVersion[]>('list_versions_full', { 
          promptUuid 
        });
        
        if (backendVersions.length === 0) {
          setVersions([]);
          setError(null);
          return;
        }
        
        // Convert backend versions to frontend format
        const frontendVersions = backendVersions.map((version, index) => ({
          uuid: version.uuid,
          semver: version.semver,
          created_at: version.created_at,
          body: version.body,
          isLatest: index === 0 // First item is latest due to ORDER BY created_at DESC
        }));
        
        // Deduplicate versions by UUID (in case of React StrictMode double-execution)
        const uniqueVersions = frontendVersions.filter((version, index, array) => 
          array.findIndex(v => v.uuid === version.uuid) === index
        );
        
        console.log(`Loading ${backendVersions.length} versions (max 5 recent), got ${uniqueVersions.length} unique`);
        
        if (!isCancelled) {
          console.log('Setting versions in VersionHistory:', uniqueVersions.map(v => ({
            semver: v.semver, 
            isLatest: v.isLatest,
            uuid: v.uuid
          })));
          setVersions(uniqueVersions);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          setError('Failed to load version history');
          console.error('Error loading versions:', err);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    if (promptUuid) {
      loadVersions();
    }

    return () => {
      isCancelled = true;
    };
  }, [promptUuid]);

  // Debug: Monitor rollbackConfirmation state changes
  useEffect(() => {
    console.log('rollbackConfirmation state changed:', rollbackConfirmation);
  }, [rollbackConfirmation]);

  const handleVersionClick = (version: Version, event: React.MouseEvent) => {
    if (event.shiftKey && selectedVersions.length === 1) {
      // Shift+click for diff mode
      const secondVersion = version;
      const firstVersion = selectedVersions[0];
      setSelectedVersions([]);
      onVersionDiff(firstVersion, secondVersion);
    } else {
      // Regular click - select version
      setSelectedVersions([version]);
      onVersionSelect(version);
    }
  };

  const handleVersionKeyDown = (version: Version, event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (event.shiftKey && selectedVersions.length === 1) {
        const secondVersion = version;
        const firstVersion = selectedVersions[0];
        setSelectedVersions([]);
        onVersionDiff(firstVersion, secondVersion);
      } else {
        setSelectedVersions([version]);
        onVersionSelect(version);
      }
    } else if (event.key === 'r' && !version.isLatest) {
      event.preventDefault();
      setRollbackConfirmation({ version, show: true });
    }
  };

  const handleRollback = (version: Version, event: React.MouseEvent) => {
    event.stopPropagation();
    
    console.log('Rollback button clicked for version:', version.semver);
    console.log('Setting rollbackConfirmation state to:', { version, show: true });
    
    // Show confirmation dialog
    setRollbackConfirmation({ version, show: true });
  };

  const confirmRollback = () => {
    if (rollbackConfirmation) {
      console.log('Calling onVersionRollback for version:', rollbackConfirmation.version);
      onVersionRollback(rollbackConfirmation.version);
      setRollbackConfirmation(null);
    }
  };

  const cancelRollback = () => {
    console.log('Rollback cancelled');
    setRollbackConfirmation(null);
  };

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  if (loading) {
    return (
      <div className={`bg-white border-r border-gray-200 ${className}`}>
        <div className="p-4 border-b border-gray-200">
          <div className="h-5 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
          <div className="h-3 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="space-y-0">
          {Array.from({ length: 6 }).map((_, index) => (
            <VersionItemSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <PerformanceProfiler id="VersionHistory">
      <div className={`bg-white border-r border-gray-200 ${className}`}>
        <div className="p-4 border-b border-gray-200">
          <h3 id="version-history-title" className="font-semibold text-gray-900 mb-2">Version History</h3>
          {selectedVersions.length === 1 && (
            <p className="text-xs text-gray-500">
              Shift+click another version to compare
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Use Enter/Space to select, R to rollback, Shift+Enter to compare
          </p>
        </div>

      {/* Version list (max 5 versions) */}
      <div className="flex-1">
        <div 
          className="overflow-y-auto" 
          style={{ height }}
          role="listbox"
          aria-labelledby="version-history-title"
          aria-multiselectable="false"
          data-testid="version-history-sidebar"
        >
          {versions.map((version) => {
            const isSelected = selectedVersions.some(v => v.uuid === version.uuid);
            const isCurrent = version.semver === currentVersion;
            
            return (
              <div
                key={version.uuid}
                onClick={(e) => handleVersionClick(version, e)}
                onKeyDown={(e) => handleVersionKeyDown(version, e)}
                tabIndex={0}
                role="option"
                aria-selected={isSelected}
                aria-label={`Version ${version.semver}${isCurrent ? ' (current)' : ''}${version.isLatest ? ' (latest)' : ''}, created ${new Date(version.created_at).toLocaleDateString()}`}
                data-testid={`version-item-${version.semver}`}
                className={`p-3 border-b border-gray-100 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                  isSelected 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'hover:bg-gray-50'
                } ${isCurrent ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <GitBranch size={14} className="text-gray-400" />
                    <span className="font-mono text-sm font-medium">
                      {version.semver}
                    </span>
                    {version.isLatest && (
                      <span className="text-green-600 text-xs bg-green-100 px-2 py-0.5 rounded">
                        Latest
                      </span>
                    )}
                  </div>
                  
                  {!version.isLatest && (
                    <button
                      onClick={(e) => {
                        console.log('Raw button click event for version:', version.semver);
                        handleRollback(version, e);
                      }}
                      className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title={`Rollback to ${version.semver}`}
                      aria-label={`Rollback to version ${version.semver}`}
                      data-testid={`rollback-button-${version.semver}`}
                      style={{ zIndex: 10, position: 'relative' }}
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                  {version.isLatest && (
                    <div className="text-xs text-gray-400">Current</div>
                  )}
                </div>
                
                <div className="flex items-center text-xs text-gray-500">
                  <Clock size={12} className="mr-1" />
                  {formatDate(version.created_at)}
                </div>
                
                {/* Preview of content changes */}
                <div className="mt-2 text-xs text-gray-600 truncate">
                  {version.body?.substring(0, 100) || 'No content'}...
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {versions.length === 0 && (
        <div className="p-4 text-center text-gray-500 text-sm">
          No version history available
        </div>
      )}

      {/* Rollback Confirmation Dialog */}
      {(rollbackConfirmation?.show || false) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="rollback-confirmation">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirm Rollback
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to rollback to version{' '}
              <span className="font-mono font-medium">
                {rollbackConfirmation.version.semver}
              </span>
              ? This will create a new version with the old content.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelRollback}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                data-testid="cancel-rollback"
              >
                Cancel
              </button>
              <button
                onClick={confirmRollback}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                data-testid="confirm-rollback"
              >
                Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PerformanceProfiler>
  );
}

export const VersionHistory = memo(VersionHistoryComponent);