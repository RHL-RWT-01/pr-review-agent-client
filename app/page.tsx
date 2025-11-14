"use client";

import { useState } from "react";
import { BarChart3, MessageSquare, Folder, Lightbulb, PartyPopper } from "lucide-react";

interface ReviewComment {
  agent: string;
  line: number | null;
  file: string | null;
  message: string;
  severity: string;
  suggestion?: string;
}

interface ReviewStats {
  total_comments: number;
  by_agent: Record<string, number>;
  by_severity: Record<string, number>;
}

interface ReviewResult {
  comments: ReviewComment[];
  stats: ReviewStats;
  summary: string;
}

interface ReviewResponse {
  status: string;
  review: ReviewResult;
}

export default function Home() {
  const [prUrl, setPrUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/review/pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pr_url: prUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to review PR");
      }

      const data: ReviewResponse = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-serif mb-2">PR Review Agent</h1>
          <p className="text-gray-600">Submit a GitHub PR URL for automated review</p>
        </header>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="mb-4">
            <label htmlFor="prUrl" className="block mb-2 font-serif">
              GitHub PR URL
            </label>
            <input
              type="text"
              id="prUrl"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/123"
              className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-gray-600"
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 cursor-pointer bg-black text-white font-serif hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
          >
            {loading ? "Reviewing..." : "Review PR"}
          </button>
        </form>

        {error && (
          <div className="mb-8 p-4 border-2 border-red-600 bg-red-50">
            <h3 className="font-serif font-bold mb-1">Error</h3>
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="border-2 border-black p-6">
            <h2 className="text-2xl font-serif mb-4">Review Results</h2>

            {result.review.summary && (
              <div className="mb-6 p-4 bg-gray-50 border-l-4 border-black">
                <h3 className="font-serif font-bold mb-2 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Review Summary
                </h3>
                <p>{result.review.summary}</p>
              </div>
            )}

            <div className="mb-6 pb-6 border-b border-gray-300">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="border-2 border-gray-300 p-4 text-center">
                  <h4 className="text-gray-600 text-sm mb-2">Total Issues</h4>
                  <div className="text-3xl font-bold">{result.review.stats.total_comments}</div>
                </div>
                {result.review.stats.by_severity.high > 0 && (
                  <div className="border-2 border-gray-300 p-4 text-center">
                    <h4 className="text-gray-600 text-sm mb-2">High Severity</h4>
                    <div className="text-3xl font-bold text-red-700">{result.review.stats.by_severity.high}</div>
                  </div>
                )}
                {result.review.stats.by_severity.medium > 0 && (
                  <div className="border-2 border-gray-300 p-4 text-center">
                    <h4 className="text-gray-600 text-sm mb-2">Medium Severity</h4>
                    <div className="text-3xl font-bold text-orange-600">{result.review.stats.by_severity.medium}</div>
                  </div>
                )}
                {result.review.stats.by_severity.low > 0 && (
                  <div className="border-2 border-gray-300 p-4 text-center">
                    <h4 className="text-gray-600 text-sm mb-2">Low Severity</h4>
                    <div className="text-3xl font-bold text-green-700">{result.review.stats.by_severity.low}</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-serif font-bold mb-3 text-xl flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Review Comments
              </h3>
              {result.review.comments.length === 0 ? (
                <p className="text-center text-gray-600 py-10 flex items-center justify-center gap-2">
                  No issues found! <PartyPopper className="w-5 h-5" />
                </p>
              ) : (
                <div className="space-y-4">
                  {result.review.comments.map((comment, index) => (
                    <div key={index} className="border-2 border-gray-300 p-5 hover:border-black transition-colors">
                      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                        <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${comment.agent === 'logic' ? 'bg-blue-100 text-blue-800' :
                          comment.agent === 'security' ? 'bg-red-100 text-red-800' :
                            comment.agent === 'performance' ? 'bg-orange-100 text-orange-800' :
                              comment.agent === 'style' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                          }`}>
                          {comment.agent}
                        </span>
                        <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${comment.severity === 'high' ? 'bg-red-200 text-red-900' :
                          comment.severity === 'medium' ? 'bg-orange-200 text-orange-900' :
                            'bg-green-200 text-green-900'
                          }`}>
                          {comment.severity}
                        </span>
                      </div>
                      {comment.file && (
                        <p className="text-sm text-gray-600 mb-2 font-mono flex items-center gap-1">
                          <Folder className="w-4 h-4" />
                          {comment.file}
                          {comment.line && ` : Line ${comment.line}`}
                        </p>
                      )}
                      <p className="mb-3 leading-relaxed">{comment.message}</p>
                      {comment.suggestion && (
                        <div className="bg-gray-50 border-l-4 border-green-600 p-3 mt-3">
                          <strong className="text-green-700 block mb-1 flex items-center gap-1">
                            <Lightbulb className="w-4 h-4" />
                            Suggestion:
                          </strong>
                          <p className="text-sm">{comment.suggestion}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
