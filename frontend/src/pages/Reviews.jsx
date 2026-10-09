import { useEffect, useState } from "react";
import api from "../services/api";

function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ reviewee: "", rating: "5", comment: "" });

  const loadReviews = async () => {
    if (!form.reviewee) return;
    const res = await api.get(`/reviews/${form.reviewee}`);
    setReviews(res.data.reviews || []);
  };

  useEffect(() => {
    if (form.reviewee) {
      loadReviews();
    }
  }, [form.reviewee]);

  const submitReview = async (e) => {
    e.preventDefault();
    await api.post("/reviews", {
      reviewee: form.reviewee,
      rating: Number(form.rating),
      comment: form.comment,
    });
    setForm({ reviewee: "", rating: "5", comment: "" });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Reviews</h1>
          <p className="mt-2 text-gray-600">Leave feedback and view reputation activity.</p>
        </div>

        <form onSubmit={submitReview} className="rounded-2xl bg-white p-6 shadow-sm space-y-3">
          <input value={form.reviewee} onChange={(e) => setForm({ ...form, reviewee: e.target.value })} placeholder="Reviewee user id" className="w-full rounded-lg border p-3" />
          <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="w-full rounded-lg border p-3">
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>
          <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="Share your experience" className="w-full rounded-lg border p-3" rows="4" />
          <button type="submit" className="rounded-lg bg-blue-600 px-5 py-3 text-white">Submit Review</button>
        </form>

        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review._id} className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="font-semibold">{review.rating}/5</p>
              <p className="text-sm text-gray-600">{review.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Reviews;
