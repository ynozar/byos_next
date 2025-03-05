'use client';

import { useState } from 'react';

export default function SetupDB() {
  const [progress, setProgress] = useState<{ step: string; status: string; message?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    setProgress([]);

    const response = await fetch('/api/init-db', { method: 'POST' });

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      for (const line of lines) {
        if (!line) continue;

        if (line.startsWith('2:')) {
          const jsonData = JSON.parse(line.slice(2));
          setProgress((prev) => [...prev, ...jsonData]);
        } else if (line.startsWith('3:')) {
          const errorMessage = JSON.parse(line.slice(2));
          setProgress((prev) => [...prev, { step: 'Error', status: 'failed', message: errorMessage }]);
        } else if (line.startsWith('d:')) {
          setProgress((prev) => [...prev, { step: 'All steps completed', status: 'done' }]);
        }
      }
    }

    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Database Initialisation</h1>
      <button
        onClick={startSetup}
        className="px-4 py-2 bg-blue-500 text-white rounded"
        disabled={loading}
      >
        {loading ? 'Setting up...' : 'Start Setup'}
      </button>

      <ul className="mt-4">
        {progress.map((p, i) => (
          <li key={i} className={`mt-1 ${p.status === 'completed' ? 'text-green-500' : 'text-gray-500'}`}>
            {p.step} - {p.status} {p.message && `(${p.message})`}
          </li>
        ))}
      </ul>
    </div>
  );
}