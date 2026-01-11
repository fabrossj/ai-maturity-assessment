'use client';

import { useState } from 'react';

interface Assessment {
  id: string;
  userName: string | null;
  userEmail: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  emailSentAt: string | null;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  PDF_GENERATED: 'bg-yellow-100 text-yellow-800',
  EMAIL_SENT: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  EMAIL_FAILED: 'bg-orange-100 text-orange-800',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Bozza',
  SUBMITTED: 'Inviato',
  PDF_GENERATED: 'PDF Generato',
  EMAIL_SENT: 'Email Inviata',
  FAILED: 'Fallito',
  EMAIL_FAILED: 'Email Fallita',
};

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  async function fetchAssessments(pwd: string) {
    setLoading(true);
    setError('');

    try {
      const credentials = btoa(`admin:${pwd}`);
      const response = await fetch('/api/admin/assessments', {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      if (response.status === 401) {
        setError('Password errata');
        setAuthenticated(false);
        return;
      }

      if (!response.ok) {
        setError('Errore nel caricamento degli assessment');
        return;
      }

      const data = await response.json();
      setAssessments(data);
      setAuthenticated(true);
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchAssessments(password);
  }

  function handleLogout() {
    setAuthenticated(false);
    setAssessments([]);
    setPassword('');
    setError('');
  }

  const canViewResults = (status: string) => status !== 'DRAFT';

  // Login form
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Admin Dashboard
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Inserisci la password admin"
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Accesso in corso...
                </span>
              ) : (
                'Accedi'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Storico Assessment</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Table container */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <svg
                className="animate-spin h-8 w-8 text-blue-600"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nessun assessment trovato
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Azienda
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stato
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data Compilazione
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {assessments.map((assessment) => (
                      <tr key={assessment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {assessment.userName || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <a
                            href={`mailto:${assessment.userEmail}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {assessment.userEmail}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              statusColors[assessment.status] ||
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {statusLabels[assessment.status] || assessment.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(assessment.submittedAt || assessment.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-3">
                            {canViewResults(assessment.status) ? (
                              <>
                                <a
                                  href={`/assessment/${assessment.id}/results`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  Vedi Risultati
                                </a>
                                <a
                                  href={`/api/assessment/${assessment.id}/pdf`}
                                  download
                                  className="text-green-600 hover:text-green-800 hover:underline"
                                >
                                  Scarica PDF
                                </a>
                              </>
                            ) : (
                              <span className="text-gray-400 italic">
                                Non completato
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Footer */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                Totale assessment: {assessments.length}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
