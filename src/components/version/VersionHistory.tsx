import { useState, useEffect } from 'react';
import { Clock, GitBranch, RotateCcw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface Version {
  uuid: string;
  semver: string;
  created_at: string;
  body: string;
  isLatest: boolean;
}

interface BackendVersionInfo {
  uuid: string;
  semver: string;
  created_at: string;
  parent_uuid?: string;
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
}

export function VersionHistory({ 
  promptUuid, 
  currentVersion,
  onVersionSelect,
  onVersionDiff,
  onVersionRollback,
  className = ''
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState<Version[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rollbackConfirmation, setRollbackConfirmation] = useState<{
    version: Version;
    show: boolean;
  } | null>(null);

  // Load versions from backend
  useEffect(() => {
    let isCancelled = false;
    
    const loadVersions = async () => {
      if (isCancelled) return;
      
      try {
        setLoading(true);
        
        // Get version list from backend
        const backendVersions = await invoke<BackendVersionInfo[]>('list_versions', { 
          promptUuid 
        });
        
        if (backendVersions.length === 0) {
          setVersions([]);
          setError(null);
          return;
        }
        
        // Load full version data for each version (including body)
        const versionPromises = backendVersions.map(async (versionInfo, index) => {
          try {
            const fullVersion = await invoke<BackendVersion | null>('get_version_by_uuid', {
              versionUuid: versionInfo.uuid
            });
            
            if (fullVersion) {
              return {
                uuid: fullVersion.uuid,
                semver: fullVersion.semver,
                created_at: fullVersion.created_at,
                body: fullVersion.body,
                isLatest: index === 0 // First item is latest due to ORDER BY created_at DESC
              };
            }
            return null;
          } catch (err) {
            console.error(`Error loading version ${versionInfo.uuid}:`, err);
            return null;
          }
        });
        
        const fullVersions = await Promise.all(versionPromises);
        const validVersions = fullVersions.filter((v): v is Version => v !== null);
        
        // Deduplicate versions by UUID (in case of React StrictMode double-execution)
        const uniqueVersions = validVersions.filter((version, index, array) => 
          array.findIndex(v => v.uuid === version.uuid) === index
        );
        
        console.log(`Loading ${backendVersions.length} versions, got ${validVersions.length} valid, ${uniqueVersions.length} unique`);
        
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
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
    <div className={`bg-white border-r border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2">Version History</h3>
        {selectedVersions.length === 1 && (
          <p className="text-xs text-gray-500">
            Shift+click another version to compare
          </p>
        )}
      </div>

      <div className="overflow-y-auto">
        {versions.map((version) => {
          const isSelected = selectedVersions.some(v => v.uuid === version.uuid);
          const isCurrent = version.semver === currentVersion;
          
          return (
            <div
              key={version.uuid}
              onClick={(e) => handleVersionClick(version, e)}
              className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${
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
                    className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded"
                    title={`Rollback to ${version.semver}`}
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
                {version.body.substring(0, 100)}...
              </div>
            </div>
          );
        })}
      </div>

      {versions.length === 0 && (
        <div className="p-4 text-center text-gray-500 text-sm">
          No version history available
        </div>
      )}

      {/* Rollback Confirmation Dialog */}
      {(rollbackConfirmation?.show || false) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
              >
                Cancel
              </button>
              <button
                onClick={confirmRollback}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}