import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface MigrationStatus {
  current_version: number;
  migrations_pending: boolean;
  migrations_just_run: boolean;
}

export function MigrationDialog() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    checkMigrationStatus();
    
    // Set a timeout to check for migrations after app startup
    const timer = setTimeout(() => {
      checkMigrationStatus();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const checkMigrationStatus = async () => {
    try {
      const migrationStatus = await invoke<MigrationStatus>('get_migration_status');
      setStatus(migrationStatus);
      
      // Only show dialog if migrations just ran during this startup
      if (migrationStatus.migrations_just_run) {
        console.log('Migrations just completed, showing dialog...');
        setShow(true);
      }
    } catch (error) {
      console.error('Failed to check migration status:', error);
    }
  };

  if (!show || !status) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-3">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Database Updated
          </h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Your database has been successfully updated to version {status.current_version}. 
          {status.current_version === 1 && " Full-text search is now available!"}
        </p>
        
        <div className="flex justify-end">
          <button
            onClick={() => setShow(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}