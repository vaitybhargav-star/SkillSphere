import React, { useState } from 'react';
import axios from 'axios';

/**
 * EnhancedReviewForm - Create a review with fraud detection
 * Shows fraud detection results before submitting
 */
export function EnhancedReviewForm({ gigId, revieweeId, onSuccess }) {
  const [formData, setFormData] = useState({
    rating: 5,
    qualityRating: 5,
    communicationRating: 5,
    deadlineRating: 5,
    professionalismRating: 5,
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const token = localStorage.getItem('token');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name.includes('Rating') ? parseInt(value) : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      alert('Please log in first');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post(
        'http://localhost:5000/api/reviews/enhanced/create',
        {
          gigId,
          revieweeId,
          ...formData,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setResult(response.data);
      if (response.data.success) {
        setTimeout(() => {
          setFormData({
            rating: 5,
            qualityRating: 5,
            communicationRating: 5,
            deadlineRating: 5,
            professionalismRating: 5,
            comment: '',
          });
          setResult(null);
          if (onSuccess) onSuccess();
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.message || 'Failed to submit review',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div
        className={`border rounded-lg p-6 ${
          result.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <p className={`${result.success ? 'text-green-800' : 'text-red-800'}`}>
          {result.message || result.success_message}
        </p>
        {result.fraudCheck && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Fraud Detection Result:</p>
            <div className="flex items-center gap-2">
              {result.fraudCheck.flagged ? (
                <span className="inline-block bg-red-200 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                  ⚠️ Flagged for Review
                </span>
              ) : (
                <span className="inline-block bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                  ✓ Passed Fraud Check
                </span>
              )}
              <span className="text-sm text-gray-600">
                Confidence: {(result.fraudCheck.confidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Leave a Review</h2>

      {/* Overall Rating */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Overall Rating
        </label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setFormData({ ...formData, rating: star })}
              className="text-3xl transition-transform hover:scale-110"
            >
              {formData.rating >= star ? '⭐' : '☆'}
            </button>
          ))}
          <span className="ml-2 text-gray-600">{formData.rating} out of 5</span>
        </div>
      </div>

      {/* Detailed Ratings */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Specific Aspects</h3>
        <div className="space-y-4">
          {[
            { key: 'qualityRating', label: 'Quality of Work' },
            { key: 'communicationRating', label: 'Communication' },
            { key: 'deadlineRating', label: 'Met Deadlines' },
            { key: 'professionalismRating', label: 'Professionalism' },
          ].map(({ key, label }) => (
            <div key={key}>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                <span className="text-sm font-semibold text-gray-900">
                  {formData[key]}/5
                </span>
              </div>
              <input
                type="range"
                name={key}
                min="1"
                max="5"
                value={formData[key]}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Your Review (Optional)
        </label>
        <textarea
          name="comment"
          value={formData.comment}
          onChange={handleChange}
          placeholder="Share details about your experience..."
          rows="4"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Detailed reviews help other freelancers and clients
        </p>
      </div>

      {/* Preview & Submit */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
        >
          {showPreview ? 'Hide Preview' : 'Preview Review'}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="mt-6 border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-3">Preview</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {Array(formData.rating)
                .fill(0)
                .map((_, i) => (
                  <span key={i}>⭐</span>
                ))}
            </div>
            <p className="text-gray-700">{formData.comment || 'No comment provided'}</p>
          </div>

          <div className="mt-4 text-xs text-gray-600">
            <p>
              📊 This review will be checked for fraud detection before posting
            </p>
          </div>
        </div>
      )}
    </form>
  );
}

export default EnhancedReviewForm;
