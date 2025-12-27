'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';

interface AreaScore {
  code: string;
  name: string;
  areaPercentage: number;
  weight: number;
  contribution: number;
  elements: Array<{
    code: string;
    percentage: number;
  }>;
}

interface AssessmentScores {
  totalScore: number;
  maturityLevel: string;
  areas: AreaScore[];
}

interface AssessmentResults {
  id: string;
  userEmail: string;
  submittedAt: string;
  scores: AssessmentScores;
}

export default function ResultsPage() {
  const params = useParams();
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch(`/api/assessment/${params.id}/results`);

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch results');
        }

        const data = await res.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [params.id]);

  const getMaturityLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      'Iniziale': 'bg-red-100 text-red-800 border-red-300',
      'Consapevole': 'bg-orange-100 text-orange-800 border-orange-300',
      'In Sviluppo': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Avanzato': 'bg-blue-100 text-blue-800 border-blue-300',
      'Leader': 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[level] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getScoreColor = (score: number) => {
    if (score <= 20) return 'text-red-600';
    if (score <= 40) return 'text-orange-600';
    if (score <= 60) return 'text-yellow-600';
    if (score <= 80) return 'text-blue-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading your results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex justify-center items-center min-h-screen">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error || 'Failed to load results'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { scores } = results;

  // Prepare data for radar chart
  const radarData = scores.areas.map(area => ({
    area: area.name,
    score: Math.round(area.areaPercentage),
    fullMark: 100
  }));

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Assessment Results</h1>
        <p className="text-gray-600">
          Submitted: {new Date(results.submittedAt).toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>

      {/* Overall Score Section */}
      <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-8">
        <div className="text-center">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-700 mb-4">
            Overall Maturity Score
          </h2>
          <div className={`text-6xl md:text-8xl font-bold mb-4 ${getScoreColor(scores.totalScore)}`}>
            {scores.totalScore.toFixed(1)}
          </div>
          <div className={`inline-block px-6 py-3 rounded-full border-2 text-lg md:text-xl font-semibold ${getMaturityLevelColor(scores.maturityLevel)}`}>
            {scores.maturityLevel}
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-8">
        <h2 className="text-xl md:text-2xl font-semibold mb-6 text-center">
          Maturity by Area
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis
              dataKey="area"
              tick={{ fill: '#4B5563', fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#6B7280' }}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#2563EB"
              fill="#3B82F6"
              fillOpacity={0.6}
            />
            <Tooltip />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Area Breakdown */}
      <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-8">
        <h2 className="text-xl md:text-2xl font-semibold mb-6">
          Detailed Breakdown by Area
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-2 md:px-4 font-semibold text-gray-700">
                  Area
                </th>
                <th className="text-right py-3 px-2 md:px-4 font-semibold text-gray-700">
                  Score
                </th>
                <th className="text-right py-3 px-2 md:px-4 font-semibold text-gray-700">
                  Weight
                </th>
                <th className="text-right py-3 px-2 md:px-4 font-semibold text-gray-700">
                  Contribution
                </th>
              </tr>
            </thead>
            <tbody>
              {scores.areas.map((area) => (
                <tr key={area.code} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-2 md:px-4">
                    <div className="font-medium text-gray-900">{area.name}</div>
                    <div className="text-sm text-gray-500">Code: {area.code}</div>
                  </td>
                  <td className="py-4 px-2 md:px-4 text-right">
                    <span className={`text-lg font-semibold ${getScoreColor(area.areaPercentage)}`}>
                      {area.areaPercentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-4 px-2 md:px-4 text-right text-gray-600">
                    {(area.weight * 100).toFixed(0)}%
                  </td>
                  <td className="py-4 px-2 md:px-4 text-right">
                    <span className="font-semibold text-gray-900">
                      {area.contribution.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-bold">
                <td className="py-4 px-2 md:px-4 text-gray-900">TOTAL</td>
                <td className="py-4 px-2 md:px-4 text-right"></td>
                <td className="py-4 px-2 md:px-4 text-right text-gray-900">100%</td>
                <td className="py-4 px-2 md:px-4 text-right">
                  <span className={`text-lg ${getScoreColor(scores.totalScore)}`}>
                    {scores.totalScore.toFixed(2)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* PDF Download and Email Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">PDF Report</h3>
            <p className="text-blue-800 mb-4">
              A detailed PDF report with your complete assessment results will be sent to your email address (<strong>{results.userEmail}</strong>) shortly.
            </p>
            <a
              href={`/api/assessment/${params.id}/pdf`}
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download PDF Report
            </a>
          </div>
        </div>
      </div>

      {/* Back to Home */}
      <div className="text-center">
        <a
          href="/"
          className="inline-block text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Home
        </a>
      </div>
    </div>
  );
}
