import { useEffect, useState } from "react";
import axios from "axios";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import AvailabilitySetup from "../components/AvailabilitySetup";

const FreelancerProfile = () => {
  const [form, setForm] = useState({
    title: "",
    bio: "",
    skills: [{ name: "", level: "Beginner" }],
    hourlyRate: "",
    milestoneRate: "",
    experience: "",
    portfolio: [{ title: "", projectLink: "" }],
    certifications: [{ title: "", organization: "", year: "" }],
    workExperience: [{ company: "", role: "", startDate: "", endDate: "", description: "" }],
    languages: [{ name: "", level: "Fluent" }],
    profileImage: "",
    resume: "",
    verificationBadge: false,
    location: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const { setAuthUser } = useAuth();

  const [geoLocation, setGeoLocation] = useState({ type: "Point", coordinates: [] });
  const [locStatus, setLocStatus] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageUploadStatus, setImageUploadStatus] = useState("idle");
  const [resumeUploadProgress, setResumeUploadProgress] = useState(0);

  const addCacheBuster = (url) => {
    if (!url || typeof url !== "string") return url;
    return `${url}${url.includes("?") ? "&" : "?"}cb=${Date.now()}`;
  };

  useEffect(() => {
    const loadProfile = async () => {
      let timeoutId;
      try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await api.get("/profile", { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.data && res.data.profile) {
          const profile = res.data.profile;
          setForm({
            title: profile.title || "",
            bio: profile.bio || "",
            skills:
              profile.skills && profile.skills.length > 0
                ? profile.skills.map((skill) => ({
                    name: typeof skill === "string" ? skill : skill.name || "",
                    level: typeof skill === "object" ? skill.level || "Beginner" : "Beginner",
                  }))
                : [{ name: "", level: "Beginner" }],
            hourlyRate: profile.hourlyRate || "",
            milestoneRate: profile.milestoneRate || "",
            experience: profile.experience || "",
            portfolio:
              profile.portfolio && profile.portfolio.length > 0
                ? profile.portfolio.map((item) => ({
                    title: item.title || "",
                    projectLink: item.projectLink || "",
                  }))
                : [{ title: "", projectLink: "" }],
            certifications:
              profile.certifications && profile.certifications.length > 0
                ? profile.certifications.map((item) => ({
                    title: item.title || "",
                    organization: item.organization || "",
                    year: item.year || "",
                  }))
                : [{ title: "", organization: "", year: "" }],
            workExperience:
              profile.workExperience && profile.workExperience.length > 0
                ? profile.workExperience.map((item) => ({
                    company: item.company || "",
                    role: item.role || "",
                    startDate: item.startDate ? new Date(item.startDate).toISOString().slice(0, 10) : "",
                    endDate: item.endDate ? new Date(item.endDate).toISOString().slice(0, 10) : "",
                    description: item.description || "",
                  }))
                : [{ company: "", role: "", startDate: "", endDate: "", description: "" }],
            languages:
              profile.languages && profile.languages.length > 0
                ? profile.languages.map((language) => ({
                    name: typeof language === "string" ? language : language.name || "",
                    level: typeof language === "object" ? language.level || "Fluent" : "Fluent",
                  }))
                : [{ name: "", level: "Fluent" }],
            profileImage: (res.data.user && res.data.user.profileImage) || profile.profileImage || "",
            resume: profile.resume || "",
            verificationBadge: profile.verificationBadge || false,
            location: profile.location || "",
          });

          const img = (res.data.user && res.data.user.profileImage) || profile.profileImage;
          if (img) setImagePreview(addCacheBuster(img));
        } else {
          setMessage("❌ No profile data found. Please try again.");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        if (error.name === "AbortError") {
          setMessage("❌ Request timeout. The server is taking too long to respond. Please try again.");
        } else if (error.response?.status === 401) {
          setMessage("❌ Unauthorized. Please log in again.");
        } else if (error.response?.status === 404) {
          setMessage("❌ Profile not found. Please contact support.");
        } else {
          setMessage("❌ " + (error.response?.data?.message || "Failed to load profile. Please try again."));
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const updateArrayField = (field, index, key, value) => {
    setForm((prev) => {
      const updated = [...prev[field]];
      updated[index] = { ...updated[index], [key]: value };
      return { ...prev, [field]: updated };
    });
  };

  const addArrayItem = (field, item) => {
    setForm((prev) => ({ ...prev, [field]: [...prev[field], item] }));
  };

  const removeArrayItem = (field, index) => {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((_, idx) => idx !== index) }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage("❌ File size must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("❌ Please select a valid image file");
      return;
    }

    const previousImage = form.profileImage;
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setImageUploadStatus("uploading");
    setUploadProgress(0);

    try {
      let uploadedUrl = "";
      try {
        const signRes = await api.get("/uploads/sign", { params: { folder: "skillsphere/profile-images" } });
        if (signRes.data && signRes.data.success) {
          const { signature, timestamp, api_key, cloud_name, folder } = signRes.data;
          const fd = new FormData();
          fd.append("file", file);
          fd.append("api_key", api_key);
          fd.append("timestamp", timestamp);
          fd.append("signature", signature);
          fd.append("folder", folder);
          fd.append("use_filename", "true");
          fd.append("unique_filename", "true");

          const cloudUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`;
          const uploadResult = await axios.post(cloudUrl, fd, {
            timeout: 30000,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
              }
            },
          });

          if (uploadResult.data && uploadResult.data.secure_url) {
            uploadedUrl = uploadResult.data.secure_url;
          } else {
            throw new Error("Cloudinary did not return a secure_url");
          }
        } else {
          throw new Error("Cloudinary signing failed or returned invalid payload");
        }
      } catch (uploadError) {
        console.warn('Image upload fallback path triggered:', uploadError);
        const fd = new FormData();
        fd.append("file", file);
        const fallbackRes = await api.post("/uploads", fd, {
          timeout: 30000,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
            }
          },
        });

        if (fallbackRes.data && fallbackRes.data.url) {
          uploadedUrl = fallbackRes.data.url;
        } else {
          throw new Error("Fallback upload did not return a URL", { cause: uploadError });
        }
      }

      setForm((prev) => ({ ...prev, profileImage: uploadedUrl }));
      setImagePreview(addCacheBuster(uploadedUrl));
      setImageUploadStatus("uploaded");
      setMessage("✅ Profile image uploaded successfully. Save to persist.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Profile image upload failed:", err);
      setMessage("❌ Profile image upload failed. Please try again.");
      setImageUploadStatus("failed");
      setImagePreview(previousImage || "");
    } finally {
      setUploadProgress(0);
    }
  };

  const handleResumeChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setMessage("❌ Resume must be less than 15MB");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage("❌ Please select a PDF, DOC, DOCX, or TXT resume file");
      return;
    }

    setResumeUploadProgress(0);
    setLoading(true);
    setMessage("");

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await api.post("/uploads/resume", fd, {
        timeout: 60000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setResumeUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      if (res.data && res.data.url) {
        setForm((prev) => ({ ...prev, resume: res.data.url }));
        setMessage("✅ Resume uploaded successfully. Save to persist.");
      } else {
        throw new Error("Resume upload did not return a URL");
      }
    } catch (err) {
      console.error("Resume upload failed:", err);
      setMessage("❌ Resume upload failed. Please try again.");
    } finally {
      setLoading(false);
      setResumeUploadProgress(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (imageUploadStatus === "uploading") {
      setMessage("⏳ Image is still uploading. Please wait before saving your profile.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const payload = {
        ...form,
        skills: form.skills.filter((skill) => skill.name.trim()),
        portfolio: form.portfolio.filter((item) => item.title.trim() || item.projectLink.trim()),
        certifications: form.certifications.filter((cert) => cert.title.trim() || cert.organization.trim()),
        workExperience: form.workExperience.filter((item) => item.company.trim() || item.role.trim()),
        languages: form.languages.filter((lang) => lang.name.trim() || lang.level.trim()),
      };

      if (geoLocation.coordinates.length === 2) {
        payload.geoLocation = geoLocation;
      }

      const res = await api.put("/profile/freelancer", payload);

      if (res.data && res.data.user && res.data.user.profileImage) {
        setAuthUser(res.data.user);
      }

      setMessage("✅ Profile updated successfully.");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Profile save error:", error);
      setMessage("❌ " + (error.response?.data?.message || "Failed to save profile."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="glass-card rounded-[2rem] p-10 shadow-[0_30px_80px_rgba(2,_6,_23,_0.45)]">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="rounded-[1.75rem] bg-gradient-to-r from-cyan-500/15 via-slate-950/60 to-violet-500/15 p-8 backdrop-blur-xl">
            <h1 className="text-4xl font-bold">Freelancer Profile</h1>
            <p className="mt-3 text-slate-300">Manage your professional profile and showcase your skills to clients.</p>
          </div>

          {loading ? (
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-10 text-center text-slate-300">
              <p className="text-xl font-semibold text-white">Loading profile...</p>
              <p className="mt-2">Please wait while we load your freelancer information.</p>
            </div>
          ) : (
            <>
              {message && (
                <div className={`rounded-3xl border p-4 text-sm ${message.includes("✅") ? "border-green-400/30 bg-green-500/10 text-green-200" : "border-red-400/30 bg-red-500/10 text-red-200"}`}>
                  {message}
                </div>
              )}

              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-8">
                <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="font-semibold block mb-2 text-slate-300">Professional Title</label>
                    <input
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="React Developer | SaaS Specialist"
                      className="auth-input w-full rounded-3xl px-4 py-3"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="font-semibold block mb-2 text-slate-300">Bio</label>
                    <textarea
                      name="bio"
                      value={form.bio}
                      onChange={handleChange}
                      placeholder="Introduce yourself, your specialty and the kind of projects you love."
                      rows="4"
                      className="auth-input w-full rounded-3xl px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-2 text-slate-300">Hourly Rate</label>
                    <input
                      name="hourlyRate"
                      type="number"
                      value={form.hourlyRate}
                      onChange={handleChange}
                      placeholder="50"
                      className="auth-input w-full rounded-3xl px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-2 text-slate-300">Milestone Rate</label>
                    <input
                      name="milestoneRate"
                      type="number"
                      value={form.milestoneRate}
                      onChange={handleChange}
                      placeholder="1200"
                      className="auth-input w-full rounded-3xl px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-2 text-slate-300">Experience (years)</label>
                    <input
                      name="experience"
                      type="number"
                      value={form.experience}
                      onChange={handleChange}
                      placeholder="5"
                      className="auth-input w-full rounded-3xl px-4 py-3"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <label className="font-semibold text-slate-300">Skills</label>
                      <button
                        type="button"
                        onClick={() => addArrayItem("skills", { name: "", level: "Beginner" })}
                        className="text-cyan-400 hover:text-cyan-200 text-sm"
                      >
                        + Add Skill
                      </button>
                    </div>
                    <div className="space-y-3">
                      {form.skills.map((skill, index) => (
                        <div key={index} className="grid gap-3 md:grid-cols-[2fr_1fr_auto] items-center">
                          <input
                            type="text"
                            placeholder="React"
                            value={skill.name}
                            onChange={(e) => updateArrayField("skills", index, "name", e.target.value)}
                            className="auth-input w-full rounded-3xl px-4 py-3"
                          />
                          <select
                            value={skill.level}
                            onChange={(e) => updateArrayField("skills", index, "level", e.target.value)}
                            className="auth-input rounded-3xl px-4 py-3 bg-slate-900"
                          >
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Advanced</option>
                            <option>Expert</option>
                          </select>
                          {form.skills.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeArrayItem("skills", index)}
                              className="rounded-3xl border border-slate-700 px-4 py-3 text-sm text-red-300 hover:bg-red-500/10"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <label className="font-semibold text-slate-300">Portfolio Gallery</label>
                      <button
                        type="button"
                        onClick={() => addArrayItem("portfolio", { title: "", projectLink: "" })}
                        className="text-cyan-400 hover:text-cyan-200 text-sm"
                      >
                        + Add Project
                      </button>
                    </div>
                    <div className="space-y-3">
                      {form.portfolio.map((item, index) => (
                        <div key={index} className="grid gap-3 md:grid-cols-[1fr_1.5fr_auto] items-center">
                          <input
                            type="text"
                            placeholder="Project title"
                            value={item.title}
                            onChange={(e) => updateArrayField("portfolio", index, "title", e.target.value)}
                            className="auth-input w-full rounded-3xl px-4 py-3"
                          />
                          <input
                            type="url"
                            placeholder="https://example.com"
                            value={item.projectLink}
                            onChange={(e) => updateArrayField("portfolio", index, "projectLink", e.target.value)}
                            className="auth-input w-full rounded-3xl px-4 py-3"
                          />
                          {form.portfolio.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeArrayItem("portfolio", index)}
                              className="rounded-3xl border border-slate-700 px-4 py-3 text-sm text-red-300 hover:bg-red-500/10"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <label className="font-semibold text-slate-300">Languages</label>
                      <button
                        type="button"
                        onClick={() => addArrayItem("languages", { name: "", level: "Fluent" })}
                        className="text-cyan-400 hover:text-cyan-200 text-sm"
                      >
                        + Add Language
                      </button>
                    </div>
                    <div className="space-y-3">
                      {form.languages.map((language, index) => (
                        <div key={index} className="grid gap-3 md:grid-cols-[1.3fr_1fr_auto] items-center">
                          <input
                            type="text"
                            placeholder="English"
                            value={language.name}
                            onChange={(e) => updateArrayField("languages", index, "name", e.target.value)}
                            className="auth-input w-full rounded-3xl px-4 py-3"
                          />
                          <input
                            type="text"
                            placeholder="Fluent"
                            value={language.level}
                            onChange={(e) => updateArrayField("languages", index, "level", e.target.value)}
                            className="auth-input w-full rounded-3xl px-4 py-3"
                          />
                          {form.languages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeArrayItem("languages", index)}
                              className="rounded-3xl border border-slate-700 px-4 py-3 text-sm text-red-300 hover:bg-red-500/10"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <label className="font-semibold text-slate-300">Certifications</label>
                      <button
                        type="button"
                        onClick={() => addArrayItem("certifications", { title: "", organization: "", year: "" })}
                        className="text-cyan-400 hover:text-cyan-200 text-sm"
                      >
                        + Add Certification
                      </button>
                    </div>
                    <div className="space-y-3">
                      {form.certifications.map((cert, index) => (
                        <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] items-center">
                          <input
                            type="text"
                            placeholder="Certification title"
                            value={cert.title}
                            onChange={(e) => updateArrayField("certifications", index, "title", e.target.value)}
                            className="auth-input w-full rounded-3xl px-4 py-3"
                          />
                          <input
                            type="text"
                            placeholder="Issuing authority"
                            value={cert.organization}
                            onChange={(e) => updateArrayField("certifications", index, "organization", e.target.value)}
                            className="auth-input w-full rounded-3xl px-4 py-3"
                          />
                          <input
                            type="number"
                            placeholder="Year"
                            value={cert.year}
                            onChange={(e) => updateArrayField("certifications", index, "year", e.target.value)}
                            className="auth-input w-full rounded-3xl px-4 py-3"
                          />
                          {form.certifications.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeArrayItem("certifications", index)}
                              className="rounded-3xl border border-slate-700 px-4 py-3 text-sm text-red-300 hover:bg-red-500/10"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <label className="font-semibold text-slate-300">Work Experience</label>
                      <button
                        type="button"
                        onClick={() => addArrayItem("workExperience", { company: "", role: "", startDate: "", endDate: "", description: "" })}
                        className="text-cyan-400 hover:text-cyan-200 text-sm"
                      >
                        + Add Role
                      </button>
                    </div>
                    <div className="space-y-4">
                      {form.workExperience.map((work, index) => (
                        <div key={index} className="rounded-3xl border border-slate-700 bg-slate-900/70 p-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <input
                              type="text"
                              placeholder="Company name"
                              value={work.company}
                              onChange={(e) => updateArrayField("workExperience", index, "company", e.target.value)}
                              className="auth-input w-full rounded-3xl px-4 py-3"
                            />
                            <input
                              type="text"
                              placeholder="Role / title"
                              value={work.role}
                              onChange={(e) => updateArrayField("workExperience", index, "role", e.target.value)}
                              className="auth-input w-full rounded-3xl px-4 py-3"
                            />
                          </div>
                          <div className="grid gap-3 md:grid-cols-2 mt-3">
                            <input
                              type="date"
                              value={work.startDate}
                              onChange={(e) => updateArrayField("workExperience", index, "startDate", e.target.value)}
                              className="auth-input w-full rounded-3xl px-4 py-3"
                            />
                            <input
                              type="date"
                              value={work.endDate}
                              onChange={(e) => updateArrayField("workExperience", index, "endDate", e.target.value)}
                              className="auth-input w-full rounded-3xl px-4 py-3"
                            />
                          </div>
                          <textarea
                            placeholder="Describe your responsibilities, achievements and impact..."
                            value={work.description}
                            onChange={(e) => updateArrayField("workExperience", index, "description", e.target.value)}
                            rows="3"
                            className="auth-input w-full rounded-3xl px-4 py-3 mt-3"
                          />
                          {form.workExperience.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeArrayItem("workExperience", index)}
                              className="mt-3 rounded-3xl border border-slate-700 px-4 py-3 text-sm text-red-300 hover:bg-red-500/10"
                            >
                              Remove experience
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex flex-col gap-3">
                      <label className="font-semibold block text-slate-300">Resume / CV</label>
                      {form.resume && (
                        <a href={form.resume} target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-100 text-sm">
                          View uploaded resume
                        </a>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleResumeChange}
                        className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100"
                      />
                      {resumeUploadProgress > 0 && (
                        <div className="mt-2 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div style={{ width: `${resumeUploadProgress}%` }} className="h-2 bg-cyan-400 transition-all" />
                        </div>
                      )}
                      <p className="text-xs text-slate-500">Supported formats: PDF, DOC, DOCX, TXT up to 15MB.</p>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-4">
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center border-2 border-slate-600 shadow-lg">
                          {imagePreview ? (
                            <img
                              key={imagePreview}
                              src={imagePreview}
                              alt="Profile Preview"
                              className="w-full h-full object-cover"
                              style={{ width: "100%", height: "100%" }}
                              onError={(e) => {
                                console.error("Image load error - URL:", e.target.src);
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="text-center">
                              <svg className="w-12 h-12 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="text-xs text-slate-400">Add Photo</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 pt-4">
                        <label className="font-semibold block mb-3 text-slate-300">Profile Image</label>
                        <div className="relative">
                          <input
                            type="file"
                            id="profileImageInput"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="profileImageInput"
                            className="inline-flex items-center justify-center px-6 py-3 rounded-3xl border-2 border-dashed border-slate-500 bg-slate-950/50 hover:bg-slate-900 cursor-pointer transition text-slate-300 hover:text-slate-100 font-medium"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Choose Image
                          </label>
                          <p className="mt-2 text-xs text-slate-400">JPG, PNG or GIF (Max 5MB)</p>
                          {uploadProgress > 0 && (
                            <div className="mt-3">
                              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div style={{ width: `${uploadProgress}%` }} className="h-2 bg-cyan-400 transition-all" />
                              </div>
                              <div className="text-xs text-slate-400 mt-1">Uploading: {uploadProgress}%</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-semibold text-slate-300">Location (for nearby gigs)</p>
                          <p className="text-sm text-slate-400 mt-1">{locStatus || (geoLocation.coordinates.length === 2 ? `Saved: ${geoLocation.coordinates[1].toFixed(5)}, ${geoLocation.coordinates[0].toFixed(5)}` : "No coordinates set")}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!navigator.geolocation) {
                              setLocStatus("Geolocation not supported by your browser.");
                              return;
                            }
                            setLocStatus("Locating...");
                            navigator.geolocation.getCurrentPosition(
                              (pos) => {
                                const lat = pos.coords.latitude;
                                const lon = pos.coords.longitude;
                                setGeoLocation({ type: "Point", coordinates: [lon, lat] });
                                setLocStatus(`Location set: ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
                              },
                              () => {
                                setLocStatus("Unable to retrieve location. Please allow location access or try again.");
                              },
                              { enableHighAccuracy: true, timeout: 10000 }
                            );
                          }}
                          className="rounded-3xl px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-100"
                        >
                          Use Current Location
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={loading || imageUploadStatus === "uploading"}
                      className="brand-button w-full rounded-3xl px-8 py-3 text-base font-semibold disabled:opacity-60"
                    >
                      {loading ? "Saving..." : imageUploadStatus === "uploading" ? "Uploading image..." : "Save Profile"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-8">
                <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-8">
                  <AvailabilitySetup />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FreelancerProfile;
