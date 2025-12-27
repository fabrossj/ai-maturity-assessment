'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Question {
  id: string;
  code: string;
  questionText: string;
  areaName: string;
  elementCode: string;
}

export default function NewAssessment() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/questionnaire/latest')
      .then(res => res.json())
      .then(data => {
        const allQuestions: Question[] = [];
        data.areas.forEach((area: any) => {
          area.elements.forEach((elem: any) => {
            elem.questions.forEach((q: any) => {
              allQuestions.push({
                ...q,
                areaName: area.name,
                elementCode: elem.code
              });
            });
          });
        });
        setQuestions(allQuestions);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading questions:', err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Create assessment
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: email, consentGiven: consent })
      });

      if (!res.ok) {
        throw new Error('Failed to create assessment');
      }

      const { id } = await res.json();

      // Update answers
      await fetch(`/api/assessment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });

      // Submit
      const submitRes = await fetch(`/api/assessment/${id}/submit`, {
        method: 'POST'
      });

      if (!submitRes.ok) {
        throw new Error('Failed to submit assessment');
      }

      // Redirect to results
      router.push(`/assessment/${id}/results`);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert('Error submitting assessment. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex justify-center items-center min-h-screen">
          <p className="text-lg">Loading questionnaire...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">AI Maturity Assessment</h1>

      <div className="mb-8 p-6 border rounded-lg bg-white shadow-sm">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded w-full mb-4"
          required
        />
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mr-2"
            required
          />
          <span>Acconsento al trattamento dati</span>
        </label>
      </div>

      <div className="mb-8">
        <p className="text-sm text-gray-600 mb-4">
          Progress: {Object.keys(answers).length} / {questions.length} questions answered
        </p>
      </div>

      {questions.map((q) => (
        <div key={q.id} className="mb-6 p-4 border rounded bg-white shadow-sm">
          <p className="font-semibold mb-2">
            <span className="text-blue-600">{q.code}</span>: {q.questionText}
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Area: {q.areaName} | Element: {q.elementCode}
          </p>
          <div className="flex gap-2 flex-wrap">
            {[0, 1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                onClick={() => setAnswers({ ...answers, [q.code]: level })}
                className={`px-4 py-2 rounded transition-colors ${
                  answers[q.code] === level
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                data-answer={level}
                type="button"
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="sticky bottom-0 bg-white p-4 border-t shadow-lg">
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < 30 || !email || !consent || submitting}
          className="bg-blue-600 text-white px-6 py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
        >
          {submitting ? 'Submitting...' : 'Invia Assessment'}
        </button>
        {Object.keys(answers).length < 30 && (
          <p className="text-sm text-red-600 mt-2">
            Please answer all {questions.length} questions before submitting
          </p>
        )}
      </div>
    </div>
  );
}
