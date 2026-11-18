import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useAttendance } from '../../context/AttendanceContext';
import { useTheme } from '../../context/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  Menu,
  LogOut,
  CheckCheck,
  Clock,
  ArrowRight,
  UserCheck,
  Timer,
  CheckCircle2,
  Sun,
  Moon,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export const Navbar = ({ onToggleSidebar, title }) => {
  const { role, user, logout, sessionWarning, renewSession } = useAuth();
  const { theme, isDark, toggleTheme, fontSize, setFontSize } = useTheme();
  const { notifications, unreadCount, loading, error, refresh, markRead, markAllRead } = useNotifications();
  const { isCheckedIn, isCheckedOut, stopwatchTime, currentSessionNumber, completedSessions, totalCompletedHours } = useAttendance();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const isEmployee = (role || '').toLowerCase() === 'employee';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notif) => {
    if (!notif.read_at) markRead(notif.id);
    setShowNotifications(false);
  };

  const handleRenewSession = async () => {
    setRenewing(true);
    try {
      await renewSession();
    } finally {
      setRenewing(false);
    }
  };

  const getRoleBadge = () => {
    if (role === 'admin') return <span className="bg-blue-100 dark:bg-blue-950 text-[#245CE2] dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full">ADMINISTRATOR</span>;
    if (role === 'employee') return <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">EMPLOYEE</span>;
    if (role === 'customer') return <span className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full">CUSTOMER CLIENT</span>;
    return null;
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 px-4 sm:px-6 py-3 shadow-subtle transition-colors duration-200">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Drawer Toggle & Desktop Collapse & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              {title || 'WorkTrack Workspace'}
            </h1>
          </div>
        </div>

        {/* Center: Session Warning if active */}
        {sessionWarning && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 rounded-xl text-xs font-semibold animate-pulse">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Session expiring in {sessionWarning.minutesRemaining || 15}m</span>
            <button
              onClick={handleRenewSession}
              disabled={renewing}
              className="ml-1 px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${renewing ? 'animate-spin' : ''}`} />
              {renewing ? 'Renewing...' : 'Renew'}
            </button>
          </div>
        )}

        {/* Right: Accessibility Controls + Theme Toggle + Notifications + Profile */}
        <div className="flex items-center gap-2 sm:gap-3" ref={dropdownRef}>
          {/* FONT SIZE ACCESSIBILITY CONTROLS: A- / A / A+ */}
          <div
            className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700"
            role="group"
            aria-label="Font size controls"
            title="Adjust text size for comfortable reading"
          >
            <button
              type="button"
              onClick={() => setFontSize('small')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                fontSize === 'small'
                  ? 'bg-white dark:bg-slate-700 text-[#245CE2] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Small text (~15px base)"
              aria-label="Small text size"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize('standard')}
              className={`px-2.5 py-1 rounded-lg text-sm font-bold transition-all ${
                fontSize === 'standard'
                  ? 'bg-white dark:bg-slate-700 text-[#245CE2] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Standard text (~16px base)"
              aria-label="Standard text size"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSize('large')}
              className={`px-2 py-1 rounded-lg text-base font-bold transition-all ${
                fontSize === 'large'
                  ? 'bg-white dark:bg-slate-700 text-[#245CE2] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Large text (~18px base for easier reading)"
              aria-label="Large text size"
            >
              A+
            </button>
          </div>

          {/* THEME TOGGLE: LIGHT / DARK MODE */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-transparent dark:border-slate-700"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                const nextVisible = !showNotifications;
                setShowNotifications(nextVisible);
                if (nextVisible) refresh();
              }}
              className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#245CE2] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-dropdown border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-blue-100 dark:bg-blue-950 text-[#245CE2] dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-[#245CE2] dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                  {loading ? (
                    <div className="p-6 text-center text-slate-400 text-sm" role="status">Loading notifications...</div>
                  ) : error ? (
                    <div className="p-6 text-center text-rose-600 text-sm" role="alert">{error}</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">
                      No notifications available
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer flex gap-3 items-start ${
                          !notif.read_at ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          !notif.read_at ? 'bg-[#245CE2]' : 'bg-transparent'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                            {notif.title}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-center">
                  <Link
                    to={`/${role}/notifications`}
                    onClick={() => setShowNotifications(false)}
                    className="text-xs font-semibold text-[#245CE2] dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    View All Notifications
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700"></div>

          {/* User Profile Button */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20"
              />
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  {user?.name || 'Authorized User'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                  {getRoleBadge()}
                </div>
              </div>
            </button>

            {/* Profile Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-dropdown border border-slate-200 dark:border-slate-700 z-50 p-2 animate-in fade-in duration-150">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate(`/${role}/profile`);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 font-medium"
                  >
                    <UserCheck className="w-4 h-4 text-slate-400" />
                    My Account Details
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
