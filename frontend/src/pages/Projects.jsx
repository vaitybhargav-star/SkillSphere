import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";

function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUserAndProjects = async () => {
      setLoading(true);
      setError("");
      let timeoutId;

      try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const raw = localStorage.getItem("user");
        const parsed = raw ? JSON.parse(raw) : null;
        const currentUser = parsed;

        if (!currentUser || !currentUser._id) {
          const res = await api.get("/profile", { signal: controller.signal });
          clearTimeout(timeoutId);
          setUser(res.data.user);
          await fetchProgress(res.data.user);
          return;
        }

        clearTimeout(timeoutId);
        setUser(currentUser);
        await fetchProgress(currentUser);
      } catch (err) {
        console.error("Unable to load projects", err);
        if (err.name === 'AbortError') {
          setError("Request timeout - taking too long to load projects.");
        } else {
          setError(err.response?.data?.message || "Failed to load projects.");
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    const fetchProgress = async (currentUser) => {
      if (!currentUser) return;
      const role = currentUser.role;
      if (role === "freelancer") {
        const res = await api.get(`/progress/freelancer/${currentUser._id}`);
        setProjects(res.data.data || []);
      } else if (role === "client") {
        const res = await api.get(`/progress/client/${currentUser._id}`);
        setProjects(res.data.data || []);
      } else {
        setError("Project tracking is available for clients and freelancers.");
      }
    };

    void loadUserAndProjects();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="mt-2 text-gray-600">Track active work and delivery milestones.</p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-700">Loading your projects...</div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-700">No active project trackers found yet.</div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <div key={project._id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{project.gig?.title || "Untitled Project"}</h2>
                    <p className="mt-1 text-sm text-slate-500">Status: {project.status}</p>
                    <p className="mt-1 text-sm text-slate-500">Client: {project.client?.fullName || project.client}</p>
                    <p className="mt-1 text-sm text-slate-500">Freelancer: {project.freelancer?.fullName || project.freelancer}</p>
                  </div>
                  <div className="flex flex-col gap-2 rounded-3xl bg-slate-50 p-4 text-slate-600">
                    <span className="text-sm">Completion</span>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-cyan-500" style={{ width: `${project.overallCompletion || 0}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{project.overallCompletion || 0}% complete</span>
                  </div>
                </div>

                {project.milestones?.length > 0 && (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {project.milestones.map((milestone, index) => (
                      <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <p className="font-semibold text-slate-900">{milestone.title || `Milestone ${index + 1}`}</p>
                        <p className="text-sm text-slate-500 mt-1">{milestone.description || "No details"}</p>
                        <p className="text-sm text-slate-500 mt-2">Status: {milestone.status}</p>
                        <p className="text-sm text-slate-500">Completion: {milestone.completionPercentage || 0}%</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Projects;
