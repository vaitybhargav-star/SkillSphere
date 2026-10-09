import { useEffect, useState } from "react";
import api from "../services/api";
import axios from 'axios';
import { useAuth } from "../context/AuthContext";

function ClientProfile() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    companySize: "solo",
    industry: "",
    website: "",
    description: "",
    billingAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    preferences: {
      preferredFreelancerLevel: "all",
      notificationsEmail: true,
      notificationsSMS: false,
    },
    profileImage: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageUploadStatus, setImageUploadStatus] = useState("idle");

  const addCacheBuster = (url) => {
    if (!url || typeof url !== 'string') return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return `${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`;
    }
    return url;
  };

  useEffect(() => {
    const loadProfile = async () => {
      let timeoutId;
      try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const res = await api.get("/profile", { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.data && res.data.profile) {
          setForm((prev) => ({
            ...prev,
            fullName: res.data.user?.fullName || prev.fullName,
            email: res.data.user?.email || prev.email,
            phone: res.data.user?.phone || prev.phone,
            ...res.data.profile,
            billingAddress: res.data.profile.billingAddress || prev.billingAddress,
            preferences: res.data.profile.preferences || prev.preferences,
            profileImage: (res.data.user && res.data.user.profileImage) || res.data.profile.profileImage || prev.profileImage,
          }));

          const img = (res.data.user && res.data.user.profileImage) || res.data.profile.profileImage;
          if (img) setImagePreview(addCacheBuster(img));
          setImageUploadStatus("idle");
        } else {
          setMessage("❌ No profile data found. Please try again.");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        if (error.name === 'AbortError') {
          setMessage("❌ Request timeout. The server is taking too long to respond. Please try again.");
        } else if (error.response?.status === 401) {
          setMessage("❌ Unauthorized. Please log in again.");
        } else if (error.response?.status === 404) {
          setMessage("❌ Profile not found. Please contact support.");
        } else {
          setMessage("❌ " + (error.response?.data?.message || "Error loading profile"));
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const [errors, setErrors] = useState({});
  const { setAuthUser } = useAuth();

  const validateField = (name, value) => {
    switch (name) {
      case 'companyName':
        if (!value || !value.trim()) return 'Company name is required';
        return '';
      case 'website':
        if (!value) return '';
        try {
            new URL(value.startsWith('http') ? value : 'https://' + value);
          return '';
          } catch {
          return 'Enter a valid website URL';
        }
      case 'zipCode':
        if (!value) return '';
        if (!/^[0-9\-\s]{2,10}$/.test(value)) return 'Enter a valid ZIP/postal code';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    const fieldValue = type === 'checkbox' ? checked : value;
    const err = validateField(name, fieldValue);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage("❌ File size must be less than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage("❌ Please select a valid image file");
      return;
    }

    const previousImage = form.profileImage;
    const previewUrl = URL.createObjectURL(file);
    console.log('Local preview URL:', previewUrl);
    setImagePreview(previewUrl);
    setUploadProgress(0);
    setImageUploadStatus("uploading");

    try {
      const signRes = await api.get('/uploads/sign', { params: { folder: 'skillsphere/profile-images' } });
      let uploadedUrl;

      if (signRes.data && signRes.data.success) {
        const { signature, timestamp, api_key, cloud_name, folder } = signRes.data;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('api_key', api_key);
        fd.append('timestamp', timestamp);
        fd.append('signature', signature);
        fd.append('folder', folder);
        fd.append('use_filename', 'true');
        fd.append('unique_filename', 'true');

        const cloudUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`;
        const uploadRes = await axios.post(cloudUrl, fd, {
          timeout: 30000,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(pct);
            }
          },
        });

        if (uploadRes.data && uploadRes.data.secure_url) {
          uploadedUrl = uploadRes.data.secure_url;
        } else {
          throw new Error('Cloudinary did not return a secure_url');
        }
      } else {
        throw new Error('Cloudinary signing failed');
      }

      setForm((prev) => ({ ...prev, profileImage: uploadedUrl }));
      setImagePreview(addCacheBuster(uploadedUrl));
      setMessage("✅ Image uploaded successfully! Click 'Save Profile' to complete.");
      setTimeout(() => setMessage(""), 3000);
      setImageUploadStatus("uploaded");
    } catch (err) {
      console.warn('Cloudinary upload failed, falling back to server upload:', err?.response?.data || err?.message || err);
      try {
        const fd2 = new FormData();
        fd2.append('file', file);
        const fallbackRes = await api.post('/uploads', fd2, {
          timeout: 30000,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(pct);
            }
          },
        });

        if (fallbackRes.data && fallbackRes.data.url) {
          const uploadedUrl = fallbackRes.data.url;
          setForm((prev) => ({ ...prev, profileImage: uploadedUrl }));
          setImagePreview(addCacheBuster(uploadedUrl));
          setUploadProgress(0);
          setMessage("✅ Image uploaded successfully! Click 'Save Profile' to complete.");
          setTimeout(() => setMessage(""), 3000);
          setImageUploadStatus("uploaded");
        } else {
          // eslint-disable-next-line preserve-caught-error
          throw new Error('Fallback upload did not return a URL');
        }
      } catch (fallbackError) {
        console.error('Upload failed:', fallbackError);
        const status = fallbackError.response?.status;
        if (status === 401 || status === 403) {
          setMessage('❌ Upload failed: authentication expired. Please log in again.');
        } else {
          setMessage('❌ Image upload failed. Please try again.');
        }
        setUploadProgress(0);
        setImagePreview(previousImage || "");
        setImageUploadStatus("failed");
      }
    }
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      billingAddress: {
        ...prev.billingAddress,
        [name]: value,
      },
    }));

    // zipCode validation lives at top-level validator helper
    if (name === 'zipCode') {
      const err = validateField('zipCode', value);
      setErrors((prev) => ({ ...prev, zipCode: err }));
    }
  };

  const handlePreferencesChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [name]: type === "checkbox" ? checked : value,
      },
    }));
  };

  const formIsValid = () => {
    // run validations for fields we care about
    const companyErr = validateField('companyName', form.companyName);
    const websiteErr = validateField('website', form.website);
    const zipErr = validateField('zipCode', form.billingAddress.zipCode);
    setErrors((prev) => ({ ...prev, companyName: companyErr, website: websiteErr, zipCode: zipErr }));
    return !companyErr && !websiteErr && !zipErr;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (imageUploadStatus === "uploading") {
      setMessage("⏳ Image upload is still in progress. Please wait before saving your profile.");
      return;
    }
    setSaving(true);
    setMessage("");

    if (!formIsValid()) {
      setMessage('Please fix the highlighted fields before saving.');
      setSaving(false);
      return;
    }

    try {
      console.log('Saving client profile with payload:', form);
      const res = await api.put("/profile/client", form);
      console.log('Profile save response:', res.data);
      
      setMessage("Profile updated successfully!");
      
      // Update local form and cached user from server response if available
      if (res.data && res.data.user) {
        const serverUser = res.data.user;
        // Update imagePreview from response if available
        if (serverUser.profileImage) {
          console.log('Updating imagePreview from server response:', serverUser.profileImage);
          setImagePreview(addCacheBuster(serverUser.profileImage));
          setForm((prev) => ({ ...prev, profileImage: serverUser.profileImage }));
        }

        // Ensure phone is updated in UI and in localStorage
        if (serverUser.phone !== undefined) {
          setForm((prev) => ({ ...prev, phone: serverUser.phone }));
        }

        try {
        setAuthUser(serverUser);
        } catch (err) {
        console.warn('Unable to update local auth user:', err);
        }
      }

      setImageUploadStatus("idle");
      
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Update error:", error);
      setMessage("❌ " + (error.response?.data?.message || "Failed to update client profile"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center text-slate-100">
          <h1 className="text-3xl font-bold mb-4">Loading profile...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="glass-card rounded-[2rem] p-10 shadow-[0_30px_80px_rgba(2,_6,_23,_0.45)]">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="rounded-[1.75rem] bg-gradient-to-r from-cyan-500/15 via-slate-950/60 to-violet-500/15 p-8 backdrop-blur-xl">
            <h1 className="text-4xl font-bold">Client Profile</h1>
            <p className="mt-3 text-slate-300">Manage your company information and preferences.</p>
          </div>

          {message && (
            <div className={`rounded-3xl border p-4 text-sm ${message.includes("✅") ? "border-green-400/30 bg-green-500/10 text-green-200" : "border-red-400/30 bg-red-500/10 text-red-200"}`}>
              {message}
            </div>
          )}

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-8">
            <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
              {/* Company Info */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-cyan-300 mb-4">Company Information</h3>
              </div>

              <div className="md:col-span-2 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-semibold block mb-2 text-slate-300">Contact Name</label>
                  <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Your name" className="auth-input w-full rounded-3xl px-4 py-3" disabled />
                </div>
                <div>
                  <label className="font-semibold block mb-2 text-slate-300">Email</label>
                  <input name="email" value={form.email} placeholder="you@example.com" className="auth-input w-full rounded-3xl px-4 py-3" disabled />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-2 text-slate-300">Company Name</label>
                <input name="companyName" value={form.companyName} onChange={handleChange} placeholder="Your company" className="auth-input w-full rounded-3xl px-4 py-3" />
                {errors.companyName && <div className="text-xs text-rose-400 mt-1">{errors.companyName}</div>}
              </div>

              <div>
                <label className="font-semibold block mb-2 text-slate-300">Website</label>
                <input name="website" value={form.website} onChange={handleChange} placeholder="https://example.com" className="auth-input w-full rounded-3xl px-4 py-3" />
                {errors.website && <div className="text-xs text-rose-400 mt-1">{errors.website}</div>}
              </div>

              <div>
                <label className="font-semibold block mb-2 text-slate-300">Company Size</label>
                <select name="companySize" value={form.companySize} onChange={handleChange} className="auth-input w-full rounded-3xl px-4 py-3">
                  <option value="solo">Solo</option>
                  <option value="small">Small (1-10)</option>
                  <option value="medium">Medium (11-100)</option>
                  <option value="large">Large (100+)</option>
                </select>
              </div>
 
              <div>
                <label className="font-semibold block mb-2 text-slate-300">Industry</label>
                <input name="industry" value={form.industry} onChange={handleChange} placeholder="e.g., Technology, Finance" className="auth-input w-full rounded-3xl px-4 py-3" />
              </div>
 
              <div>
                <label className="font-semibold block mb-2 text-slate-300">Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="(555) 123-4567" className="auth-input w-full rounded-3xl px-4 py-3" />
              </div>

              <div className="md:col-span-2">
                <label className="font-semibold block mb-2 text-slate-300">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="Tell us about your company..." rows="4" className="auth-input w-full rounded-3xl px-4 py-3" />
              </div>

              {/* Billing Address */}
              <div className="md:col-span-2 mt-6">
                <h3 className="text-lg font-semibold text-cyan-300 mb-4">Billing Address</h3>
              </div>

              <div className="md:col-span-2">
                <label className="font-semibold block mb-2 text-slate-300">Street</label>
                <input name="street" value={form.billingAddress.street} onChange={handleAddressChange} placeholder="123 Main Street" className="auth-input w-full rounded-3xl px-4 py-3" />
              </div>

              <div>
                <label className="font-semibold block mb-2 text-slate-300">City</label>
                <input name="city" value={form.billingAddress.city} onChange={handleAddressChange} className="auth-input w-full rounded-3xl px-4 py-3" />
              </div>

              <div>
                <label className="font-semibold block mb-2 text-slate-300">State</label>
                <input name="state" value={form.billingAddress.state} onChange={handleAddressChange} className="auth-input w-full rounded-3xl px-4 py-3" />
              </div>

              <div>
                <label className="font-semibold block mb-2 text-slate-300">ZIP Code</label>
                <input name="zipCode" value={form.billingAddress.zipCode} onChange={handleAddressChange} className="auth-input w-full rounded-3xl px-4 py-3" />
                {errors.zipCode && <div className="text-xs text-rose-400 mt-1">{errors.zipCode}</div>}
              </div>

              <div>
                <label className="font-semibold block mb-2 text-slate-300">Country</label>
                <input name="country" value={form.billingAddress.country} onChange={handleAddressChange} className="auth-input w-full rounded-3xl px-4 py-3" />
              </div>

              {/* Preferences */}
              <div className="md:col-span-2 mt-6">
                <h3 className="text-lg font-semibold text-cyan-300 mb-4">Preferences</h3>
              </div>

              <div className="md:col-span-2">
                <label className="font-semibold block mb-2 text-slate-300">Preferred Freelancer Level</label>
                <select name="preferredFreelancerLevel" value={form.preferences.preferredFreelancerLevel} onChange={handlePreferencesChange} className="auth-input w-full rounded-3xl px-4 py-3">
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginners</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Experts</option>
                </select>
              </div>

              <div className="flex items-center gap-3 md:col-span-2">
                <input type="checkbox" name="notificationsEmail" checked={form.preferences.notificationsEmail} onChange={handlePreferencesChange} className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-cyan-500" />
                <label className="font-semibold text-slate-300">Email Notifications</label>
              </div>

              <div className="flex items-center gap-3 md:col-span-2">
                <input type="checkbox" name="notificationsSMS" checked={form.preferences.notificationsSMS} onChange={handlePreferencesChange} className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-cyan-500" />
                <label className="font-semibold text-slate-300">SMS Notifications</label>
              </div>

              <div className="md:col-span-2 flex flex-col gap-4">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center border-2 border-slate-600 shadow-lg">
                      {imagePreview ? (
                        <img 
                          key={imagePreview}
                          src={imagePreview} 
                          alt="Company Logo Preview" 
                          className="w-full h-full object-cover" 
                          style={{ width: '100%', height: '100%' }}
                          onError={(e) => {
                            console.error('Image load error - URL:', e.target.src);
                            e.target.style.display = 'none';
                          }}
                          onLoad={(e) => {
                            console.log('Image loaded successfully - URL:', e.target.src);
                            e.target.style.display = 'block';
                          }}
                        />
                      ) : (
                        <div className="text-center">
                          <svg className="w-12 h-12 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-xs text-slate-400">Add Logo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 pt-4">
                    <label className="font-semibold block mb-3 text-slate-300">Company Logo</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        id="companyLogoInput"
                        accept="image/*" 
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <label 
                        htmlFor="companyLogoInput"
                        className="inline-flex items-center justify-center px-6 py-3 rounded-3xl border-2 border-dashed border-slate-500 bg-slate-950/50 hover:bg-slate-900 cursor-pointer transition text-slate-300 hover:text-slate-100 font-medium"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Choose Image
                      </label>
                      <p className="mt-2 text-xs text-slate-400">JPG, PNG or GIF (Max 5MB)</p>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="mt-3">
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div style={{ width: `${uploadProgress}%` }} className="h-2 bg-cyan-400 transition-all"></div>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">Uploading: {uploadProgress}%</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={saving || imageUploadStatus === 'uploading'} className="brand-button w-full rounded-3xl px-8 py-3 text-base font-semibold disabled:opacity-60">
                   {saving ? "Saving..." : imageUploadStatus === 'uploading' ? "Uploading image..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientProfile;
