import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

const btnPrimary =
  'px-4 py-2 bg-neon text-dark font-semibold rounded-xl text-sm transition-all duration-300 shadow-neon hover:bg-neon-dim hover:shadow-neon-lg hover:shadow-glow';

const btnSecondary =
  'px-3 py-2 bg-dark-300/60 backdrop-blur-xs text-dark-800 rounded-xl text-sm transition-all duration-300 border border-white/[0.06] hover:bg-dark-400/80 hover:border-white/[0.1] hover:text-white';

const btnGhost =
  'text-sm px-3 py-1.5 rounded-xl font-medium transition-all duration-300 bg-neon/10 text-neon border border-neon/20 hover:bg-neon/20 hover:shadow-glow-sm';

const inputClass =
  'w-full px-4 py-3 bg-dark-100/50 border border-white/[0.06] rounded-xl text-white text-sm transition-all duration-200 placeholder:text-dark-600 focus:outline-none focus:border-neon/40 focus:ring-1 focus:ring-neon/20 focus:bg-dark-100/80';

const glassCard =
  'rounded-2xl bg-dark-200/60 backdrop-blur-glass border border-white/[0.06] shadow-neon-inner';

function FileSize({ bytes }) {
  if (bytes < 1024) return <>{bytes} B</>;
  if (bytes < 1024 * 1024) return <>{(bytes / 1024).toFixed(1)} KB</>;
  return <>{(bytes / (1024 * 1024)).toFixed(1)} MB</>;
}

const EXT_COLORS = {
  pdf: 'text-red-400 bg-red-400/10 border-red-400/20',
  txt: 'text-dark-800 bg-white/5 border-white/10',
  md: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  csv: 'text-green-400 bg-green-400/10 border-green-400/20',
  json: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
};

function CopyButton({ onClick, copied }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-dark-300/80 backdrop-blur-xs border border-white/[0.08] text-dark-700 hover:text-neon hover:border-neon/30 hover:shadow-glow-sm transition-all duration-300"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function CurlSnippet({ id, apiKey, showKey }) {
  const base = window.location.origin.replace(':5173', ':8000');
  const key = showKey ? apiKey : 'YOUR_API_KEY';
  const body = `'{"message": "Hello!", "sessionId": "user-123"}'`;
  return (
    <pre className="bg-dark/80 border border-white/[0.06] rounded-xl p-5 pr-24 text-[13px] font-mono leading-relaxed overflow-x-auto whitespace-pre">
      <span className="text-purple-400">curl</span>
      <span className="text-dark-700"> -X </span>
      <span className="text-neon">POST</span>
      <span className="text-dark-700"> {base}/api/embed/chat/{id} \{'\n'}</span>
      <span className="text-dark-700">  -H </span>
      <span className="text-amber-300/90">"Content-Type: application/json"</span>
      <span className="text-dark-700"> \{'\n'}</span>
      <span className="text-dark-700">  -H </span>
      <span className="text-amber-300/90">"X-API-Key: {key}"</span>
      <span className="text-dark-700"> \{'\n'}</span>
      <span className="text-dark-700">  -d </span>
      <span className="text-green-400">{body}</span>
    </pre>
  );
}

function EmbedSnippet({ snippet }) {
  const parts = snippet.match(/^(<iframe src=")([^"]+)(" width="[^"]+" height="[^"]+" style="[^"]+" allow="[^"]+"><\/iframe>)$/);
  if (!parts) {
    return (
      <pre className="bg-dark/80 border border-white/[0.06] rounded-xl p-5 pr-24 text-[13px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all text-dark-800">
        {snippet}
      </pre>
    );
  }
  return (
    <pre className="bg-dark/80 border border-white/[0.06] rounded-xl p-5 pr-24 text-[13px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
      <span className="text-dark-700">&lt;iframe src=</span>
      <span className="text-green-400">"{parts[2]}"</span>
      <span className="text-dark-700"> width="400" height="600" style="border:none;border-radius:12px;" allow="clipboard-write"&gt;&lt;/iframe&gt;</span>
    </pre>
  );
}

const TABS = [
  { id: 'prompts', label: (n) => `Prompts (${n})` },
  { id: 'files', label: (n) => `Files (${n})` },
  { id: 'integrate', label: () => 'Integrate' },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [files, setFiles] = useState([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('prompts');
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectRes, promptsRes, filesRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get(`/prompts/${id}`),
          api.get(`/files/${id}`),
        ]);
        setProject(projectRes.data);
        setSystemPrompt(projectRes.data.systemPrompt);
        setPrompts(promptsRes.data);
        setFiles(filesRes.data);
      } catch (error) {
        toast.error('Failed to load project');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleUpdateSystem = async () => {
    try {
      await api.put(`/projects/${id}`, { ...project, systemPrompt });
      toast.success('System prompt saved');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleAddPrompt = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/prompts/${id}`, { title: newPromptTitle, content: newPromptContent });
      toast.success('Prompt added');
      setNewPromptTitle('');
      setNewPromptContent('');
      setShowPromptForm(false);
      const res = await api.get(`/prompts/${id}`);
      setPrompts(res.data);
    } catch (error) {
      toast.error('Failed to add prompt');
    }
  };

  const handleDeletePrompt = async (promptId) => {
    try {
      await api.delete(`/prompts/${promptId}`);
      toast.success('Prompt deleted');
      setPrompts(prompts.filter(p => p._id !== promptId));
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const res = await api.post(`/files/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('File uploaded & processed');
      setFiles(prev => [res.data.file, ...prev]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await api.delete(`/files/delete/${fileId}`);
      toast.success('File removed');
      setFiles(files.filter(f => f._id !== fileId));
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const handleRegenerateKey = async () => {
    if (!confirm('Regenerate API key? Existing integrations will stop working.')) return;
    try {
      const res = await api.post(`/projects/${id}/regenerate-key`);
      setProject(res.data);
      toast.success('API key regenerated');
    } catch (error) {
      toast.error('Failed to regenerate key');
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
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

  if (!project) return <div className="text-center py-10 text-dark-700">Project not found</div>;

  const ext = (name) => name.split('.').pop().toLowerCase();
  const embedUrl = `${window.location.origin.replace(':5173', ':8000')}/embed/${id}?key=${project.apiKey}`;
  const embedSnippet = `<iframe src="${embedUrl}" width="400" height="600" style="border:none;border-radius:12px;" allow="clipboard-write"></iframe>`;
  const maskedKey = project.apiKey
    ? `${project.apiKey.slice(0, 4)}${'•'.repeat(Math.max(0, project.apiKey.length - 8))}${project.apiKey.slice(-4)}`
    : '••••••••••••••••••••••••••••••••';

  const tabIndex = TABS.findIndex(t => t.id === tab);
  const tabCounts = { prompts: prompts.length, files: files.length, integrate: 0 };

  return (
    <div className="relative max-w-4xl mx-auto px-4 py-10 lg:py-12 animate-fade-in">
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-gradient-radial from-neon/15 via-neon/5 to-transparent blur-3xl pointer-events-none"
        aria-hidden
      />

      <div className="relative flex items-center gap-4 mb-10">
        <Link
          to="/"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-dark-200/60 backdrop-blur-xs border border-white/[0.06] text-dark-600 hover:text-neon hover:border-neon/30 transition-all duration-300"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-neon/60 mb-1">Agent</p>
          <h1 className="text-2xl font-bold text-white tracking-tight truncate">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-dark-700 mt-1 line-clamp-2">{project.description}</p>
          )}
        </div>
        <Link to={`/chat/${id}`} className={`${btnPrimary} flex items-center gap-2 shrink-0`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Chat
        </Link>
      </div>

      <section className="relative mb-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon/50 to-transparent rounded-t-2xl" />
        <div className={`${glassCard} p-6 lg:p-7`}>
          <div className="mb-4">
            <h2 className="font-semibold text-white text-[15px]">System Prompt</h2>
            <p className="text-xs text-dark-700 mt-1">Defines the personality and behavior of your agent.</p>
          </div>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className={`${inputClass} font-mono text-[13px] leading-relaxed`}
            rows={4}
          />
          <div className="mt-4 flex justify-end">
            <button onClick={handleUpdateSystem} className={btnPrimary}>
              Save
            </button>
          </div>
        </div>
      </section>

      <div className="relative mb-6">
        <div className="inline-flex p-1 rounded-xl bg-dark-200/60 backdrop-blur-glass border border-white/[0.06]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative z-10 px-5 py-2 text-sm font-medium rounded-lg transition-colors duration-300 ${
                tab === t.id ? 'text-neon' : 'text-dark-700 hover:text-dark-900'
              }`}
            >
              {t.label(tabCounts[t.id])}
            </button>
          ))}
          <div
            className="absolute top-1 bottom-1 rounded-lg bg-dark-400/80 border border-white/[0.06] shadow-neon-inner transition-all duration-300 ease-out"
            style={{
              width: `calc(${100 / TABS.length}% - 4px)`,
              left: `calc(${(tabIndex * 100) / TABS.length}% + 2px)`,
            }}
          />
        </div>
      </div>

      {tab === 'prompts' && (
        <section className={`${glassCard} p-6 lg:p-7 animate-fade-in`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-white text-[15px]">Knowledge Prompts</h2>
              <p className="text-xs text-dark-700 mt-1">Context your agent uses during conversations.</p>
            </div>
            <button
              onClick={() => setShowPromptForm(!showPromptForm)}
              className={showPromptForm
                ? 'text-sm px-3 py-1.5 rounded-xl font-medium transition-all duration-300 bg-dark-400/80 text-dark-800 border border-white/[0.06]'
                : btnGhost}
            >
              {showPromptForm ? 'Cancel' : '+ Add'}
            </button>
          </div>

          {showPromptForm && (
            <form
              onSubmit={handleAddPrompt}
              className="rounded-xl border border-white/[0.06] bg-dark-100/40 backdrop-blur-xs p-5 mb-5 space-y-4 animate-fade-in"
            >
              <input
                type="text"
                value={newPromptTitle}
                onChange={(e) => setNewPromptTitle(e.target.value)}
                placeholder="Prompt title (e.g. Return Policy)"
                className={inputClass}
                required
              />
              <textarea
                value={newPromptContent}
                onChange={(e) => setNewPromptContent(e.target.value)}
                placeholder="Content or instructions..."
                className={inputClass}
                rows={3}
                required
              />
              <button type="submit" className={btnPrimary}>
                Add Prompt
              </button>
            </form>
          )}

          {prompts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-neon/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-dark-600 text-sm">No prompts added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prompts.map((prompt) => (
                <div
                  key={prompt._id}
                  className="group rounded-xl border border-white/[0.06] bg-dark-100/30 backdrop-blur-xs p-4 hover:border-neon/20 hover:bg-dark-100/50 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-white">{prompt.title}</h4>
                      <p className="text-xs text-dark-700 mt-1.5 line-clamp-2 leading-relaxed">{prompt.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeletePrompt(prompt._id)}
                      className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-8 h-8 rounded-lg text-dark-600 hover:text-red-400 hover:bg-red-400/10 transition-all duration-300 shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'files' && (
        <section className={`${glassCard} p-6 lg:p-7 animate-fade-in`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-white text-[15px]">Documents</h2>
              <p className="text-xs text-dark-700 mt-1">Uploaded files are parsed and used as chat context.</p>
            </div>
            <label
              className={`cursor-pointer transition-all duration-300 ${
                uploading
                  ? 'text-sm px-3 py-1.5 rounded-xl font-medium bg-dark-400/80 text-dark-600 border border-white/[0.06]'
                  : btnGhost
              }`}
            >
              {uploading ? 'Processing...' : '+ Upload'}
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".txt,.pdf,.json,.csv,.md"
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          {files.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-neon/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-dark-600 text-sm">Upload PDFs, text files, CSVs, or JSON.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => {
                const extension = ext(file.originalName);
                const extStyle = EXT_COLORS[extension] || 'text-dark-700 bg-white/5 border-white/10';
                return (
                  <div
                    key={file._id}
                    className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-dark-100/30 backdrop-blur-xs px-4 py-3 hover:border-neon/20 hover:bg-dark-100/50 transition-all duration-300"
                  >
                    <div className={`shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center text-[10px] font-bold uppercase tracking-wide ${extStyle}`}>
                      {extension}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{file.originalName}</p>
                      <p className="text-xs text-dark-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span><FileSize bytes={file.size} /></span>
                        {file.hasContent && (
                          <>
                            <span className="text-dark-500">·</span>
                            <span className="text-neon/70">{file.contentLength.toLocaleString()} chars</span>
                          </>
                        )}
                        {!file.hasContent && (
                          <>
                            <span className="text-dark-500">·</span>
                            <span className="text-amber-400">extraction failed</span>
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteFile(file._id)}
                      className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-8 h-8 rounded-lg text-dark-600 hover:text-red-400 hover:bg-red-400/10 transition-all duration-300 shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'integrate' && (
        <section className="space-y-6 animate-fade-in">
          <div className={glassCard + ' p-6 lg:p-7'}>
            <div className="mb-4">
              <h2 className="font-semibold text-white text-[15px]">API Key</h2>
              <p className="text-xs text-dark-700 mt-1">Use this key to authenticate requests to the public chat API.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 relative group">
                <div className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-neon/60 to-neon/10" />
                <code className="block w-full pl-4 pr-4 py-3 bg-dark/80 border border-white/[0.06] rounded-xl text-sm font-mono tracking-wide text-neon truncate">
                  {showKey ? project.apiKey : maskedKey}
                </code>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setShowKey(!showKey)} className={btnSecondary}>
                  {showKey ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => copyToClipboard(project.apiKey, 'key')}
                  className={btnSecondary}
                >
                  {copied === 'key' ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleRegenerateKey}
                  className="px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all duration-300"
                >
                  Regenerate
                </button>
              </div>
            </div>
          </div>

          <div className={glassCard + ' p-6 lg:p-7'}>
            <div className="mb-4">
              <h2 className="font-semibold text-white text-[15px]">REST API</h2>
              <p className="text-xs text-dark-700 mt-1">Send messages programmatically from any backend or frontend.</p>
            </div>
            <div className="relative group">
              <CurlSnippet id={id} apiKey={project.apiKey} showKey={showKey} />
              <CopyButton
                onClick={() => copyToClipboard(
                  `curl -X POST ${window.location.origin.replace(':5173', ':8000')}/api/embed/chat/${id} -H "Content-Type: application/json" -H "X-API-Key: ${project.apiKey}" -d '{"message": "Hello!", "sessionId": "user-123"}'`,
                  'curl',
                )}
                copied={copied === 'curl'}
              />
            </div>
          </div>

          <div className={glassCard + ' p-6 lg:p-7'}>
            <div className="mb-4">
              <h2 className="font-semibold text-white text-[15px]">Embed Widget</h2>
              <p className="text-xs text-dark-700 mt-1">Drop this iframe into any website to add a chat widget.</p>
            </div>
            <div className="relative">
              <EmbedSnippet snippet={embedSnippet} />
              <CopyButton
                onClick={() => copyToClipboard(embedSnippet, 'embed')}
                copied={copied === 'embed'}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <a
                href={embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-neon hover:text-neon-dim transition-colors duration-300"
              >
                Open embed preview
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
