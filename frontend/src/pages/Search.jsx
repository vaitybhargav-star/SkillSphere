import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

function Search() {
  const [searchType, setSearchType] = useState("gigs");
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    q: "",
    skills: "",
    minBudget: "",
    maxBudget: "",
    minRate: "",
    maxRate: "",
    minRating: "",
    minExperience: "",
    experience: "",
    location: "",
    sort: "newest",
  });

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await api.get("/search/filters");
        setFilters(res.data.data);
      } catch (error) {
        console.error("Failed to fetch filters:", error);
      }
    };
    fetchFilters();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = searchType === "gigs" ? "/search/gigs" : "/search/freelancers";
      const res = await api.get(endpoint, { params: searchParams });
      setResults(res.data.data[searchType] || []);
    } catch (error) {
      console.error("Search failed:", error);
      alert("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleParamChange = (key, value) => {
    setSearchParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="rounded-[2rem] bg-gradient-to-r from-cyan-500/15 via-slate-900/80 to-violet-500/15 border border-white/10 p-8">
            <h1 className="text-4xl font-extrabold text-white">Advanced Search</h1>
            <p className="mt-3 text-slate-300">Find the perfect gigs or freelancers</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="glass-card rounded-[2rem] p-8 h-fit">
              <h2 className="text-xl font-bold mb-6 text-white">Filters</h2>

              <div className="space-y-5">
                {/* Search Type */}
                <div>
                  <label className="text-sm font-semibold text-slate-300 mb-2 block">
                    Search For
                  </label>
                  <select
                    value={searchType}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchType(value);
                      setSearchParams((prev) => ({
                        ...prev,
                        sort: value === "gigs" ? "newest" : "rating",
                      }));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2 text-white"
                  >
                    <option value="gigs">Gigs</option>
                    <option value="freelancers">Freelancers</option>
                  </select>
                </div>

                {/* Search Term */}
                <div>
                  <label className="text-sm font-semibold text-slate-300 mb-2 block">
                    Search Term
                  </label>
                  <input
                    type="text"
                    value={searchParams.q}
                    onChange={(e) => handleParamChange("q", e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2 text-white"
                  />
                </div>

                {/* Skills */}
                {filters?.skills && (
                  <div>
                    <label className="text-sm font-semibold text-slate-300 mb-2 block">
                      Skills
                    </label>
                    <input
                      type="text"
                      value={searchParams.skills}
                      onChange={(e) => handleParamChange("skills", e.target.value)}
                      placeholder="React, Node..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                )}

                {/* Budget / Rate range */}
                {searchType === "gigs" ? (
                  <>
                    <div>
                      <label className="text-sm font-semibold text-slate-300 mb-2 block">
                        Min Budget ($)
                      </label>
                      <input
                        type="number"
                        value={searchParams.minBudget}
                        onChange={(e) => handleParamChange("minBudget", e.target.value)}
                        placeholder="100"
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-300 mb-2 block">
                        Max Budget ($)
                      </label>
                      <input
                        type="number"
                        value={searchParams.maxBudget}
                        onChange={(e) => handleParamChange("maxBudget", e.target.value)}
                        placeholder="5000"
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2 text-white"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-semibold text-slate-300 mb-2 block">
                        Min Hourly Rate ($)
                      </label>
                      <input
                        type="number"
                        value={searchParams.minRate}
                        onChange={(e) => handleParamChange("minRate", e.target.value)}
                        placeholder="20"
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-300 mb-2 block">
                        Max Hourly Rate ($)
                      </label>
                      <input
                        type="number"
                        value={searchParams.maxRate}
                        onChange={(e) => handleParamChange("maxRate", e.target.value)}
                        placeholder="100"
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2 text-white"
                      />
                    </div>
                  </>
                )}
 
                {/* Rating */}
                <div>
                  <label className="text-sm font-semibold text-slate-300 mb-2 block">
                    {searchType === "gigs" ? "Minimum Required Rating" : "Min Rating"}
                  </label>
                  <select
                    value={searchParams.minRating}
                    onChange={(e) => handleParamChange("minRating", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2 text-white"
                  >
                    <option value="">Any</option>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <option key={r} value={r}>
                        {r}★ & up
                      </option>
                    ))}
                  </select>
                </div>
 
                {/* Experience */}
                <div>
                  <label className="text-sm font-semibold text-slate-300 mb-2 block">
                    {searchType === "gigs" ? "Experience Level" : "Min Experience"}
                  </label>
                  {searchType === "gigs" ? (
                    <select
                      value={searchParams.experience}
                      onChange={(e) => handleParamChange("experience", e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2 text-white"
                    >
                      <option value="">Any</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="expert">Expert</option>
                    </select>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      value={searchParams.minExperience}
                      onChange={(e) => handleParamChange("minExperience", e.target.value)}
                      placeholder="2"
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2 text-white"
                    />
                  )}
                </div>
 
                {/* Location */}
                <div>
                  <label className="text-sm font-semibold text-slate-300 mb-2 block">
                    Location
                  </label>
                  <input
                    type="text"
                    value={searchParams.location}
                    onChange={(e) => handleParamChange("location", e.target.value)}
                    placeholder="New York"
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2 text-white"
                  />
                </div>

                {/* Sort */}
                <div>
                  <label className="text-sm font-semibold text-slate-300 mb-2 block">
                    Sort By
                  </label>
                  <select
                    value={searchParams.sort}
                    onChange={(e) => handleParamChange("sort", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2 text-white"
                  >
                    {searchType === "gigs" ? (
                      <>
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="budget-high">Budget (High to Low)</option>
                        <option value="budget-low">Budget (Low to High)</option>
                      </>
                    ) : (
                      <>
                        <option value="rating">Rating</option>
                        <option value="rate-high">Rate (High to Low)</option>
                        <option value="rate-low">Rate (Low to High)</option>
                        <option value="experience">Experience</option>
                        <option value="recent">Newest</option>
                      </>
                    )}
                  </select>
                </div>

                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="w-full brand-button rounded-2xl py-3 font-semibold disabled:opacity-60"
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">
                  {searchType === "gigs" ? "Gig Results" : "Freelancer Results"} ({results.length})
                </h2>
              </div>

              {results.length === 0 ? (
                <div className="glass-card rounded-[2rem] p-12 text-center">
                  <p className="text-slate-400">
                    {loading ? "Searching..." : "No results found. Try adjusting your filters."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((item) => (
                    <div key={item._id} className="glass-card rounded-[1.75rem] p-6 border border-white/10">
                      {searchType === "gigs" ? (
                        <>
                          <h3 className="text-xl font-bold text-white">{item.title}</h3>
                          <p className="text-slate-400 mt-2">{item.description.substring(0, 150)}...</p>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <span className="text-emerald-400 font-semibold">${item.budget}</span>
                            <span className="text-slate-400">{item.category}</span>
                            {item.skills.map((s) => (
                              <span key={s} className="bg-cyan-500/20 text-cyan-200 px-3 py-1 rounded-full text-sm">
                                {s}
                              </span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="text-xl font-bold text-white">{item.user?.fullName}</h3>
                          <p className="text-slate-400 mt-1">{item.title}</p>
                          <div className="mt-4 grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-slate-400 text-sm">Hourly Rate</p>
                              <p className="text-white font-semibold">${item.hourlyRate}/hr</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-sm">Rating</p>
                              <p className="text-white font-semibold">{item.averageRating}★</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-sm">Experience</p>
                              <p className="text-white font-semibold">{item.experience}yrs</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default Search;
