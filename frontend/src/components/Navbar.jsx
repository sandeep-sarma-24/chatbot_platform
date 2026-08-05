import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-dark/40 backdrop-blur-xl supports-[backdrop-filter]:bg-dark-100/30 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-neon/20 after:to-transparent">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="group flex items-center gap-2.5 transition-opacity duration-200 hover:opacity-95"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-neon/10 border border-neon/20 shadow-glow-sm transition-all duration-300 group-hover:border-neon/40 group-hover:bg-neon/15 group-hover:shadow-neon">
            <div
              className="absolute inset-0 rounded-lg bg-gradient-neon opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden="true"
            />
            <svg
              className="relative w-4 h-4 text-neon transition-transform duration-300 group-hover:scale-105"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white transition-colors duration-200 group-hover:text-neon/90">
            Yellow AI
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-1 sm:gap-2">
            {location.pathname !== '/' && (
              <Link
                to="/"
                className="px-3 py-1.5 text-[13px] font-medium text-dark-800 rounded-md transition-all duration-200 hover:text-neon hover:bg-white/[0.04]"
              >
                Projects
              </Link>
            )}

            <div className="flex items-center gap-2 pl-2 sm:pl-3 ml-1 sm:ml-2 border-l border-white/[0.06]">
              <div className="w-7 h-7 rounded-full bg-neon/10 border border-neon/20 flex items-center justify-center transition-all duration-200 hover:border-neon/35 hover:shadow-glow-sm">
                <span className="text-xs font-semibold text-neon">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-[13px] text-dark-800 hidden sm:block max-w-[140px] truncate">
                {user.name}
              </span>
              <button
                onClick={logout}
                className="p-1.5 rounded-md text-dark-700 transition-all duration-200 hover:text-red-400 hover:bg-white/[0.04]"
                title="Sign out"
              >
                <svg
                  className="w-[18px] h-[18px]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
