import { useState, useEffect } from 'react';
import { Clock, GitBranch, RotateCcw } from 'lucide-react';

interface Version {
  uuid: string;
  semver: string;
  created_at: string;
  body: string;
  isLatest: boolean;
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

  // Mock data for now - will be replaced with IPC calls
  useEffect(() => {
    const loadVersions = async () => {
      try {
        setLoading(true);
        
        // Mock version data
        const mockVersions: Version[] = [
          {
            uuid: 'v1',
            semver: '2.1.2',
            created_at: '2025-07-06T08:32:00Z',
            body: 'Latest version content...',
            isLatest: true
          },
          {
            uuid: 'v2',
            semver: '2.1.1',
            created_at: '2025-07-06T08:21:00Z',
            body: 'Previous version content...',
            isLatest: false
          },
          {
            uuid: 'v3',
            semver: '2.1.0',
            created_at: '2025-07-05T21:14:00Z',
            body: 'Even older version content...',
            isLatest: false
          }
        ];
        
        setVersions(mockVersions);
        setError(null);
      } catch (err) {
        setError('Failed to load version history');
        console.error('Error loading versions:', err);
      } finally {
        setLoading(false);
      }
    };

    if (promptUuid) {
      loadVersions();
    }
  }, [promptUuid]);

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
    
    if (confirm(`Are you sure you want to rollback to version ${version.semver}? This will create a new version with the old content.`)) {
      onVersionRollback(version);
    }
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
                    onClick={(e) => handleRollback(version, e)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    title={`Rollback to ${version.semver}`}
                  >
                    <RotateCcw size={14} />
                  </button>
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
    </div>
  );
}