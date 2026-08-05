import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

const btnPrimary =
  'px-5 py-2.5 bg-neon text-dark font-semibold rounded-xl text-sm transition-all duration-300 shadow-neon hover:bg-neon-dim hover:shadow-neon-lg hover:shadow-glow';

const btnSecondary =
  'px-5 py-2.5 bg-dark-300/80 text-dark-900 font-medium rounded-xl text-sm transition-all duration-300 border border-white/[0.06] hover:bg-dark-400/80 hover:border-white/[0.1]';

const inputClass =
  'w-full px-4 py-3 bg-dark-100/50 border border-white/[0.06] rounded-xl text-white text-sm transition-all duration-200 placeholder:text-dark-600 focus:outline-none focus:border-neon/40 focus:ring-1 focus:ring-neon/20 focus:bg-dark-100/80';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects/');
      setProjects(res.data);
    } catch (error) {
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/projects', { name, description });
      toast.success('Agent created');
      setName('');
      setDescription('');
      setShowForm(false);
      fetchProjects();
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this agent and all its data?')) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Agent deleted');
      fetchProjects();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="relative">
          <div className="absolute inset-0 w-10 h-10 rounded-full bg-neon/20 blur-xl animate-pulse-glow" />
          <div className="relative w-6 h-6 border-2 border-neon border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
      <div className="relative mb-12 animate-fade-in">
        <div
          className="absolute -top-12 -left-8 w-80 h-40 bg-gradient-radial from-neon/20 via-neon/5 to-transparent blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-neon/70 mb-2">Dashboard</p>
            <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">Projects</h1>
            <p className="text-dark-800 mt-2 text-sm">
              {projects.length} agent{projects.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={showForm ? btnSecondary : btnPrimary}
          >
            {showForm ? 'Cancel' : '+ New Agent'}
          </button>
        </div>
      </div>

      {showForm && (
        <div
          className="relative mb-12 animate-fade-in"
          style={{ animationDuration: '0.5s' }}
        >
          <div className="relative rounded-2xl p-px bg-gradient-to-br from-neon/40 via-neon/10 to-white/[0.04] shadow-neon">
            <form
              onSubmit={handleCreate}
              className="rounded-2xl bg-dark-200/40 backdrop-blur-glass border border-white/[0.04] p-7 lg:p-8"
            >
              <h2 className="text-lg font-semibold text-white mb-1">Create a new agent</h2>
              <p className="text-sm text-dark-700 mb-6">Configure a chatbot agent for your use case.</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-dark-900 mb-2">Agent Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Customer Support Bot, Sales Assistant"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-900 mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={inputClass}
                    placeholder="What does this agent do?"
                    rows={3}
                  />
                </div>
                <button type="submit" className={btnPrimary}>
                  Create Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div
          className="relative py-28 animate-fade-in"
          style={{ animationDuration: '0.6s' }}
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
            <div className="w-96 h-96 rounded-full bg-gradient-radial from-neon/35 via-neon/12 to-transparent blur-3xl opacity-80 animate-pulse-glow" />
          </div>
          <div className="relative text-center max-w-md mx-auto">
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 rounded-2xl bg-neon/30 blur-2xl scale-150" />
              <div className="relative w-20 h-20 rounded-2xl bg-dark-200/60 backdrop-blur-glass border border-neon/30 flex items-center justify-center animate-glow">
                <svg className="w-9 h-9 text-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">No agents yet</h3>
            <p className="text-dark-700 text-sm mb-8 leading-relaxed">
              Create your first chatbot agent to start building intelligent conversations.
            </p>
            <button onClick={() => setShowForm(true)} className={btnPrimary}>
              Create your first agent
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, i) => (
            <div
              key={project._id}
              className="group animate-fade-in"
              style={{
                animationDelay: `${120 + i * 90}ms`,
                animationDuration: '0.55s',
              }}
            >
              <div className="relative rounded-2xl p-px bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent transition-all duration-500 group-hover:from-neon/50 group-hover:via-neon/20 group-hover:to-neon/5 group-hover:shadow-neon-lg">
                <div className="relative rounded-2xl bg-dark-200/35 backdrop-blur-glass overflow-hidden transition-all duration-500 group-hover:bg-dark-200/50 group-hover:shadow-neon">
                  <div className="absolute inset-0 bg-gradient-to-br from-neon/[0.07] via-transparent to-transparent pointer-events-none transition-opacity duration-500 group-hover:from-neon/[0.12]" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-neon-inner pointer-events-none" />

                  <div className="relative p-7">
                    <div className="flex items-start justify-between mb-5">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-xl bg-neon/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative w-12 h-12 rounded-xl bg-neon/10 border border-neon/25 flex items-center justify-center transition-all duration-300 group-hover:border-neon/50 group-hover:bg-neon/15 group-hover:shadow-glow-sm">
                          <svg className="w-6 h-6 text-neon transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(project._id)}
                        className="opacity-0 group-hover:opacity-100 p-2 -mr-2 -mt-2 rounded-lg text-dark-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <h3 className="font-semibold text-white text-lg mb-2 tracking-tight group-hover:text-glow transition-all duration-300">
                      {project.name}
                    </h3>
                    <p className="text-sm text-dark-700 mb-6 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                      {project.description || 'No description'}
                    </p>

                    <div className="flex gap-3 pt-5 border-t border-white/[0.06]">
                      <Link
                        to={`/project/${project._id}`}
                        className="flex-1 text-center text-sm py-2.5 text-dark-900 bg-dark-300/60 backdrop-blur-xs rounded-xl border border-white/[0.06] hover:bg-dark-400/80 hover:border-white/[0.1] transition-all duration-300 font-medium"
                      >
                        Configure
                      </Link>
                      <Link
                        to={`/chat/${project._id}`}
                        className="flex-1 text-center text-sm py-2.5 text-dark bg-neon rounded-xl font-semibold transition-all duration-300 shadow-neon hover:bg-neon-dim hover:shadow-neon-lg"
                      >
                        Chat
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
