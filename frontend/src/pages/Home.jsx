import { Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { FaSearch, FaUsers, FaMapMarkerAlt } from "react-icons/fa";

function Home() {
  return (
    <MainLayout>
      <section className="hero-shell min-h-screen overflow-hidden py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/85 p-10 shadow-2xl shadow-cyan-500/10">
            <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl"></div>
            <div className="pointer-events-none absolute left-0 bottom-0 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"></div>

            <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <span className="inline-flex rounded-full bg-cyan-500/15 px-4 py-2 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">
                  Smart hiring for modern teams
                </span>
                <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
                  Discover <span className="text-cyan-300">top freelancers</span> with AI-powered matching
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                  SkillSphere makes hiring local talent effortless with intelligent recommendations, secure payments, and smooth collaboration tools designed to help your business move faster.
                </p>

                <div className="mt-10 flex flex-wrap gap-4">
                  <Link to="/register" className="brand-button inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-semibold transition">
                    Hire Talent
                  </Link>
                  <Link to="/search" className="inline-flex items-center justify-center rounded-full border border-cyan-400/30 bg-slate-900/90 px-8 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800">
                    Explore Advanced Search
                  </Link>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 glow-card">
                    <p className="font-semibold text-cyan-300">4.8/5</p>
                    <p className="mt-1 text-slate-400">Average freelancer rating</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 glow-card">
                    <p className="font-semibold text-violet-300">Trusted by 12K+</p>
                    <p className="mt-1 text-slate-400">businesses worldwide</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 glow-card">
                    <p className="font-semibold text-sky-300">Instant shortlist</p>
                    <p className="mt-1 text-slate-400">AI-powered matching in seconds</p>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-[1.75rem] p-10 text-slate-100">
                <h2 className="text-2xl font-bold mb-8 text-white">Why SkillSphere?</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-5">
                    <div className="mt-1 rounded-3xl bg-cyan-500/15 p-4 text-cyan-300">
                      <FaSearch className="text-3xl" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">AI Job Matching</h3>
                      <p className="mt-2 text-slate-400">Perfect-match recommendations for every project requirement.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-5">
                    <div className="mt-1 rounded-3xl bg-violet-500/15 p-4 text-violet-300">
                      <FaUsers className="text-3xl" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">Verified Freelancers</h3>
                      <p className="mt-2 text-slate-400">Work with vetted professionals who deliver results.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-5">
                    <div className="mt-1 rounded-3xl bg-sky-500/15 p-4 text-sky-300">
                      <FaMapMarkerAlt className="text-3xl" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">Hyperlocal Hiring</h3>
                      <p className="mt-2 text-slate-400">Find local talent with the skills your project needs.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}

export default Home;