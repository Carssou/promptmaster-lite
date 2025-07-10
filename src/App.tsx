import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import toast from 'react-hot-toast';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { NewPrompt } from './pages/NewPrompt';
import { EditorScreen } from './pages/EditorScreen';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'new', element: <NewPrompt /> },
      { path: 'editor/:promptId', element: <EditorScreen /> },
    ],
  },
]);

export default function App() {
  useEffect(() => {
    // Listen for file deletion events from the backend
    const unlistenFileDeleted = listen('file-deleted', (event) => {
      const payload = event.payload as { kind: string; paths: string[] };
      const fileCount = payload.paths.length;
      
      if (fileCount === 1) {
        const filename = payload.paths[0].split('/').pop() || 'Unknown file';
        toast.success(`Recreated deleted file: ${filename}`, {
          duration: 4000,
          icon: '🔄',
        });
      } else {
        toast.success(`Recreated ${fileCount} deleted files`, {
          duration: 4000,
          icon: '🔄',
        });
      }
    });

    // Cleanup function
    return () => {
      unlistenFileDeleted.then((fn) => fn());
    };
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}