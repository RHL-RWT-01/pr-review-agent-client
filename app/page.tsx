"use client";

import { useState } from "react";
import { BarChart3, MessageSquare, Folder, Lightbulb, PartyPopper, AlertCircle, Clock } from "lucide-react";

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
  const [errorType, setErrorType] = useState<'rate_limit' | 'server' | 'network' | 'validation' | 'general' | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorType(null);
    setRetryAfter(null);
    setResult(null);

    try {
      const response = await fetch(`${SERVER_URL}/review/pr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pr_url: prUrl }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: response.statusText };
        }

        // Handle different error types
        switch (response.status) {
          case 429:
            setErrorType('rate_limit');
            const retryAfterHeader = response.headers.get('Retry-After');
            if (retryAfterHeader) {
              setRetryAfter(parseInt(retryAfterHeader));
            }
            throw new Error(
              errorData.detail ||
              "Rate limit exceeded. Please wait a moment before trying again."
            );
          case 400:
            setErrorType('validation');
            throw new Error(
              errorData.detail ||
              "Invalid request. Please check the PR URL and try again."
            );
          case 413:
            setErrorType('validation');
            throw new Error(
              errorData.detail ||
              "PR is too large to review. Please try a smaller PR."
            );
          case 500:
          case 502:
          case 503:
          case 504:
            setErrorType('server');
            throw new Error(
              errorData.detail ||
              "Server error. Please try again in a few moments."
            );
          default:
            setErrorType('general');
            throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
        }
      }

      const data: ReviewResponse = await response.json();
      setResult(data);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setErrorType('network');
        setError("Cannot connect to the API server. Please check if the server is running.");
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      }
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
          <div className={`mb-8 p-4 border-2 ${errorType === 'rate_limit'
              ? 'border-orange-600 bg-orange-50'
              : errorType === 'validation'
                ? 'border-yellow-600 bg-yellow-50'
                : errorType === 'network'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-red-600 bg-red-50'
            }`}>
            <div className="flex items-start gap-3">
              {errorType === 'rate_limit' ? (
                <Clock className="w-5 h-5 mt-0.5 text-orange-700 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 mt-0.5 text-red-700 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className="font-serif font-bold mb-1 flex items-center gap-2">
                  {errorType === 'rate_limit' && 'Rate Limit Exceeded'}
                  {errorType === 'validation' && 'Invalid Request'}
                  {errorType === 'network' && 'Connection Error'}
                  {errorType === 'server' && 'Server Error'}
                  {errorType === 'general' && 'Error'}
                  {!errorType && 'Error'}
                </h3>
                <p className={`${errorType === 'rate_limit'
                    ? 'text-orange-800'
                    : errorType === 'validation'
                      ? 'text-yellow-800'
                      : errorType === 'network'
                        ? 'text-blue-800'
                        : 'text-red-800'
                  } mb-2`}>{error}</p>
                {errorType === 'rate_limit' && retryAfter && (
                  <p className="text-sm text-orange-700 mt-2">
                    ⏱️ Please wait approximately {retryAfter} seconds before retrying.
                  </p>
                )}
                {errorType === 'rate_limit' && !retryAfter && (
                  <p className="text-sm text-orange-700 mt-2">
                    💡 Tip: Wait a few minutes before submitting another review request.
                  </p>
                )}
                {errorType === 'network' && (
                  <p className="text-sm text-blue-700 mt-2">
                    💡 Tip: Make sure the API server is running at <code className="bg-blue-100 px-1 py-0.5 rounded">{SERVER_URL}</code>
                  </p>
                )}
                {(errorType === 'server' || errorType === 'general') && (
                  <button
                    onClick={handleSubmit}
                    className="mt-3 px-4 py-2 bg-black text-white text-sm font-serif hover:bg-gray-800 transition-colors"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
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
                          <strong className="text-green-700 mb-1 flex items-center gap-1">
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
