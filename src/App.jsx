import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { StoreProvider, useStore } from './Store';
import { Sidebar, Editor, Icon } from './Components';
import { ListView, CalendarView, GalleryView, FilesView, TeamView, MiscView, ArchiveView, ActiveView, SettingsView } from './Views';
import { SongListView, SongDetailView, ReleasesListView, ReleaseDetailView, CombinedTimelineView, TaskDashboardView, FinancialsView, ProgressView, EventsListView, EventDetailView, ExpensesListView, ExpenseDetailView, VideosListView, VideoDetailView, GlobalTasksListView, GlobalTaskDetailView } from './SpecViews';
import { COLOR_VALUES, THEME, cn } from './utils';

// Toast notification context and component
const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  
  const showToast = useCallback((message, options = {}) => {
    const id = crypto.randomUUID();
    const toast = {
      id,
      message,
      type: options.type || 'info', // 'info', 'success', 'error', 'warning'
      duration: options.duration ?? 5000,
      action: options.action || null, // { label: string, onClick: () => void }
    };
    setToasts(prev => [...prev, toast]);
    
    // Auto-dismiss after duration
    if (toast.duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, toast.duration);
    }
    
    return id;
  }, []);
  
  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  return (
    <ToastContext.Provider value={{ showToast, dismissToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
};

// Toast notification display component
const ToastContainer = () => {
  const { toasts, dismissToast } = useToast();
  const { data } = useStore();
  const settings = data.settings || {};
  const isDark = settings.themeMode === 'dark';
  const focusMode = settings.focusMode || false;
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2 max-w-sm w-full px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center justify-between gap-3 p-4 w-full",
            focusMode ? "rounded-lg shadow-lg border" : "border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.85)]",
            isDark 
              ? "bg-slate-800 text-slate-50 border-slate-600" 
              : "bg-white text-slate-900 border-black",
            toast.type === 'success' && (isDark ? 'border-l-green-500' : 'border-l-green-600'),
            toast.type === 'error' && (isDark ? 'border-l-red-500' : 'border-l-red-600'),
            toast.type === 'warning' && (isDark ? 'border-l-yellow-500' : 'border-l-yellow-600'),
            focusMode ? "border-l-4" : "border-l-8"
          )}
          style={{ animation: 'slideInUp 0.3s ease-out' }}
        >
          <span className={cn(
            "flex-1 text-sm",
            focusMode ? "font-medium" : "font-bold uppercase"
          )}>
            {toast.message}
          </span>
          
          <div className="flex items-center gap-2">
            {toast.action && (
              <button
                onClick={() => {
                  toast.action.onClick();
                  dismissToast(toast.id);
                }}
                className={cn(
                  "px-3 py-1 text-xs font-bold uppercase transition-colors",
                  focusMode ? "rounded bg-[var(--accent)] text-slate-900 hover:opacity-80" : "bg-[var(--accent)] text-slate-900 border-2 border-black hover:-translate-y-0.5 active:translate-y-0",
                  isDark && !focusMode && "border-slate-600"
                )}
              >
                {toast.action.label}
              </button>
            )}
            <button
              onClick={() => dismissToast(toast.id)}
              className={cn(
                "p-1 transition-colors",
                isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Icon name="X" size={16} />
            </button>
          </div>
        </div>
      ))}
      
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

// Custom hook to handle mutations with undo toast notifications
export const useUndoableAction = () => {
  const { showToast } = useToast();
  const { actions } = useStore();
  
  const performAction = useCallback(async (actionFn, successMessage) => {
    try {
      await actionFn();
      showToast(successMessage, {
        type: 'success',
        action: { // Always show undo since we just added to stack
          label: 'Undo',
          onClick: async () => {
            const result = await actions.undo();
            if (result?.undone) {
              showToast(`Undone: ${result.description}`, { type: 'info', duration: 3000 });
            }
          }
        }
      });
    } catch (error) {
      showToast(`Error: ${error.message || 'Action failed'}`, { type: 'error' });
    }
  }, [showToast, actions]);
  
  const triggerUndo = useCallback(async () => {
    const result = await actions.undo();
    if (result?.undone) {
      showToast(`Undone: ${result.description}`, { type: 'info', duration: 3000 });
    } else {
      showToast('Nothing to undo', { type: 'warning', duration: 2000 });
    }
    return result;
  }, [actions, showToast]);
  
  return { performAction, triggerUndo };
};

// Floating Action Button (FAB) for mobile quick actions
const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const fabRef = useRef(null);
  const { data, actions } = useStore();
  const { showToast } = useToast();
  const settings = data.settings || {};
  const isDark = settings.themeMode === 'dark';

  // Quick add form state
  const [taskTitle, setTaskTitle] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [noteTitle, setNoteTitle] = useState('');

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fabRef.current && !fabRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleAddTask = async () => {
    if (!taskTitle.trim()) return;
    await actions.addGlobalTask({
      taskName: taskTitle.trim(),
      status: 'Not Started',
      category: 'Other'
    });
    showToast(`Task "${taskTitle.trim()}" created`, { type: 'success' });
    setTaskTitle('');
    setShowTaskModal(false);
  };

  const handleAddExpense = async () => {
    if (!expenseName.trim()) return;
    await actions.addExpense({
      name: expenseName.trim(),
      paidCost: parseFloat(expenseAmount) || 0,
      status: 'Complete'
    });
    showToast(`Expense "${expenseName.trim()}" logged`, { type: 'success' });
    setExpenseName('');
    setExpenseAmount('');
    setShowExpenseModal(false);
  };

  const handleAddNote = async () => {
    if (!noteTitle.trim()) return;
    await actions.addGlobalTask({
      taskName: noteTitle.trim(),
      status: 'Not Started',
      category: 'Other',
      notes: 'Quick note'
    });
    showToast(`Note "${noteTitle.trim()}" created`, { type: 'success' });
    setNoteTitle('');
    setShowNoteModal(false);
  };

  const menuItems = [
    { 
      label: 'Add Task', 
      icon: 'Activity', 
      action: () => { setIsOpen(false); setShowTaskModal(true); },
      color: isDark ? 'bg-purple-600' : 'bg-purple-500'
    },
    { 
      label: 'Log Expense', 
      icon: 'Receipt', 
      action: () => { setIsOpen(false); setShowExpenseModal(true); },
      color: isDark ? 'bg-green-600' : 'bg-green-500'
    },
    { 
      label: 'Quick Note', 
      icon: 'FileText', 
      action: () => { setIsOpen(false); setShowNoteModal(true); },
      color: isDark ? 'bg-blue-600' : 'bg-blue-500'
    }
  ];

  // Quick add modal component
  const QuickModal = ({ title, show, onClose, onSubmit, children }) => {
    if (!show) return null;
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div 
          className={cn(
            "w-full max-w-sm p-4",
            THEME.punk.card,
            isDark ? "bg-slate-800" : "bg-white"
          )}
          onClick={e => e.stopPropagation()}
        >
          <h3 className={cn("font-black uppercase text-lg mb-4 border-b-4 pb-2", isDark ? "border-slate-600" : "border-black")}>
            {title}
          </h3>
          {children}
          <div className="flex gap-2 mt-4">
            <button 
              onClick={onClose}
              className={cn("flex-1 py-2", THEME.punk.btn)}
            >
              Cancel
            </button>
            <button 
              onClick={onSubmit}
              className={cn("flex-1 py-2", THEME.punk.btn, "bg-[var(--accent)] text-slate-900")}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* FAB Container - Only visible on mobile/tablet */}
      <div 
        ref={fabRef}
        className="md:hidden fixed bottom-6 right-6 z-30"
      >
        {/* Expanded Menu Items */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 flex flex-col gap-3 mb-2">
            {menuItems.map((item, index) => (
              <button
                key={item.label}
                onClick={item.action}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-white font-bold uppercase text-sm whitespace-nowrap",
                  "border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.85)]",
                  "transform transition-all duration-200 hover:-translate-y-1",
                  isDark ? "border-slate-600" : "border-black",
                  item.color
                )}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.2s ease-out forwards'
                }}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Main FAB Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center",
            "border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.85)]",
            "transform transition-all duration-200",
            isOpen ? "rotate-45" : "rotate-0",
            isDark 
              ? "bg-[var(--accent)] border-slate-600 text-slate-900" 
              : "bg-[var(--accent)] border-black text-slate-900"
          )}
        >
          <Icon name="Plus" size={24} strokeWidth={3} />
        </button>
      </div>

      {/* Task Modal */}
      <QuickModal 
        title="Add Task" 
        show={showTaskModal} 
        onClose={() => setShowTaskModal(false)}
        onSubmit={handleAddTask}
      >
        <input
          type="text"
          value={taskTitle}
          onChange={e => setTaskTitle(e.target.value)}
          placeholder="Task name..."
          className={cn("w-full", THEME.punk.input)}
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleAddTask()}
        />
      </QuickModal>

      {/* Expense Modal */}
      <QuickModal 
        title="Log Expense" 
        show={showExpenseModal} 
        onClose={() => setShowExpenseModal(false)}
        onSubmit={handleAddExpense}
      >
        <div className="space-y-3">
          <input
            type="text"
            value={expenseName}
            onChange={e => setExpenseName(e.target.value)}
            placeholder="Expense name..."
            className={cn("w-full", THEME.punk.input)}
            autoFocus
          />
          <input
            type="number"
            value={expenseAmount}
            onChange={e => setExpenseAmount(e.target.value)}
            placeholder="Amount ($)"
            className={cn("w-full", THEME.punk.input)}
            onKeyDown={e => e.key === 'Enter' && handleAddExpense()}
          />
        </div>
      </QuickModal>

      {/* Note Modal */}
      <QuickModal 
        title="Quick Note" 
        show={showNoteModal} 
        onClose={() => setShowNoteModal(false)}
        onSubmit={handleAddNote}
      >
        <input
          type="text"
          value={noteTitle}
          onChange={e => setNoteTitle(e.target.value)}
          placeholder="Note title..."
          className={cn("w-full", THEME.punk.input)}
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleAddNote()}
        />
      </QuickModal>

      {/* Animation keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

function AppInner() {
  const [tab, setTab] = useState('songs');
  const [editing, setEditing] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedGlobalTask, setSelectedGlobalTask] = useState(null);
  const { data, actions } = useStore();
  const settings = data.settings || {};
  const isDark = settings.themeMode === 'dark';
  const focusMode = settings.focusMode || false;
  const accent = COLOR_VALUES[settings.themeColor || 'pink'] || COLOR_VALUES.pink;

  // Feature 4: Era Mode state
  const eraModeActive = settings.eraModeActive && settings.eraModeEraId;
  const eraModeEra = eraModeActive ? (data.eras || []).find(e => e.id === settings.eraModeEraId) : null;

  // Phase 10: Apply dark class to html element for Tailwind dark mode
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Handle song selection
  const handleSelectSong = (song) => {
    setSelectedSong(song);
    setTab('songDetail');
  };

  // Handle release selection
  const handleSelectRelease = (release) => {
    setSelectedRelease(release);
    setTab('releaseDetail');
  };

  // Handle event selection
  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setTab('eventDetail');
  };

  // Handle expense selection
  const handleSelectExpense = (expense) => {
    setSelectedExpense(expense);
    setTab('expenseDetail');
  };

  // Handle video selection - Following unified Item/Page architecture
  const handleSelectVideo = (video) => {
    setSelectedVideo(video);
    setTab('videoDetail');
  };

  // Handle global task selection - Following unified Item/Page architecture
  const handleSelectGlobalTask = (task) => {
    setSelectedGlobalTask(task);
    setTab('globalTaskDetail');
  };

  return (
    <div
      style={{
        '--accent': accent.base,
        '--accent-strong': accent.strong,
        '--accent-soft': accent.soft,
      }}
      data-focus-mode={focusMode ? 'true' : undefined}
      className={cn(
        "flex h-screen overflow-hidden",
        focusMode ? "font-sans" : cn("punk-shell", THEME.punk.font),
        isDark ? "bg-slate-900 text-slate-50" : "bg-slate-50 text-slate-900"
      )}
    >
      {/* Sidebar - hidden in focus mode */}
      {!focusMode && (
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          activeTab={tab}
          setActiveTab={(t) => { setTab(t); setSelectedSong(null); setSelectedRelease(null); setSelectedEvent(null); setSelectedExpense(null); setSelectedVideo(null); setSelectedGlobalTask(null); }}
        />
      )}

      <main
        className={cn(
          "flex-1 flex flex-col min-w-0 relative transition-all duration-200",
          focusMode ? "ml-0" : "ml-0 md:ml-64",
          focusMode ? "" : "punk-canvas",
          isDark ? "text-slate-50" : "text-slate-900"
        )}
      >
        {/* Header with Focus Mode Toggle and Mobile Menu */}
        <div className={cn(
          "fixed top-0 right-0 z-30 p-4 flex items-center gap-2",
          focusMode ? "left-0" : "left-0 md:left-64"
        )}>
          {/* Mobile Menu Button - only when not in focus mode */}
          {!focusMode && !sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className={cn(
                "md:hidden p-2 shadow-lg",
                focusMode ? "border" : "border-4",
                isDark ? "bg-slate-800 text-slate-50 border-slate-600" : "bg-white text-slate-900 border-black"
              )}
            >
              <Icon name="Menu" />
            </button>
          )}
          
          {/* Spacer to push focus mode toggle to the right */}
          <div className="flex-1" />
          
          {/* Focus Mode Toggle Button */}
          <button
            onClick={() => actions.saveSettings({ focusMode: !focusMode })}
            title={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
            className={cn(
              "p-2 flex items-center gap-2 font-bold uppercase text-xs transition-transform hover:-translate-y-0.5",
              focusMode ? "border rounded" : "border-[3px]",
              focusMode ? "shadow-sm" : "shadow-[4px_4px_0px_0px_rgba(0,0,0,0.85)]",
              isDark 
                ? "bg-slate-800 text-slate-50 border-slate-600 hover:bg-slate-700" 
                : "bg-white text-slate-900 border-black hover:bg-[var(--accent-soft)]",
              focusMode && "bg-[var(--accent)] text-slate-900"
            )}
          >
            <Icon name={focusMode ? "EyeOff" : "Eye"} size={18} />
            <span className="hidden sm:inline">{focusMode ? "Exit Focus" : "Focus"}</span>
          </button>
        </div>

        {/* Feature 4: Era Mode Indicator Banner */}
        {eraModeActive && eraModeEra && (
          <div className={cn(
            "fixed top-14 right-0 z-20 px-4 py-2 flex items-center justify-between gap-4",
            focusMode ? "left-0 border-b" : "left-0 md:left-64 border-b-4",
            focusMode 
              ? "bg-yellow-300 border-yellow-500 text-black"
              : "bg-yellow-400 border-black text-black"
          )}>
            <div className="flex items-center gap-2 font-bold text-sm">
              <span>🎯 ERA MODE:</span>
              <span style={{ color: eraModeEra.color || '#000' }}>{eraModeEra.name}</span>
            </div>
            <button 
              onClick={() => actions.saveSettings({ eraModeActive: false })}
              className={cn(
                "px-3 py-1 text-xs font-bold",
                focusMode 
                  ? "bg-gray-800 text-white rounded hover:bg-gray-700"
                  : "bg-black text-white hover:bg-gray-800"
              )}
            >
              Exit Era Mode
            </button>
          </div>
        )}

        <div className={cn(
          "flex-1 overflow-y-auto",
          "pt-16", // Always have padding for the header
          eraModeActive && "pt-28" // Extra padding when era mode banner is shown
        )}>
          {/* Songs - Following unified Item/Page architecture */}
          {tab === 'songs' && <SongListView onSelectSong={handleSelectSong} />}
          {tab === 'songDetail' && selectedSong && <SongDetailView song={selectedSong} onBack={() => { setSelectedSong(null); setTab('songs'); }} />}
          
          {/* Videos - Following unified Item/Page architecture */}
          {tab === 'videos' && <VideosListView onSelectVideo={handleSelectVideo} />}
          {tab === 'videoDetail' && selectedVideo && <VideoDetailView video={selectedVideo} onBack={() => { setSelectedVideo(null); setTab('videos'); }} />}
          
          {/* Global Tasks - Following unified Item/Page architecture */}
          {tab === 'globalTasks' && <GlobalTasksListView onSelectTask={handleSelectGlobalTask} />}
          {tab === 'globalTaskDetail' && selectedGlobalTask && <GlobalTaskDetailView task={selectedGlobalTask} onBack={() => { setSelectedGlobalTask(null); setTab('globalTasks'); }} />}
          
          {/* Releases - Following unified Item/Page architecture */}
          {tab === 'releases' && <ReleasesListView onSelectRelease={handleSelectRelease} />}
          {tab === 'releaseDetail' && selectedRelease && <ReleaseDetailView release={selectedRelease} onBack={() => { setSelectedRelease(null); setTab('releases'); }} onSelectSong={handleSelectSong} />}
          
          {tab === 'timeline' && <CombinedTimelineView />}
          
          {/* Events - Following unified Item/Page architecture */}
          {tab === 'events' && <EventsListView onSelectEvent={handleSelectEvent} />}
          {tab === 'eventDetail' && selectedEvent && <EventDetailView event={selectedEvent} onBack={() => { setSelectedEvent(null); setTab('events'); }} />}
          
          {/* Expenses - Following unified Item/Page architecture */}
          {tab === 'expenses' && <ExpensesListView onSelectExpense={handleSelectExpense} />}
          {tab === 'expenseDetail' && selectedExpense && <ExpenseDetailView expense={selectedExpense} onBack={() => { setSelectedExpense(null); setTab('expenses'); }} />}
          
          {/* Task Dashboard - replaces confusing Plan view */}
          {tab === 'dashboard' && <TaskDashboardView />}
          
          {/* Financial and Progress Views */}
          {tab === 'financials' && <FinancialsView />}
          {tab === 'progress' && <ProgressView />}
          
          {/* Original Views */}
          {tab === 'list' && <ListView onEdit={setEditing} />}
          {tab === 'calendar' && <CalendarView onEdit={setEditing} onSelectEvent={handleSelectEvent} />}
          {tab === 'gallery' && <GalleryView />}
          {tab === 'files' && <FilesView />}
          {tab === 'team' && <TeamView />}
          {tab === 'misc' && <MiscView />}
          {tab === 'archive' && <ArchiveView />}
          {tab === 'active' && <ActiveView onEdit={setEditing} />}
          {tab === 'settings' && <SettingsView />}
        </div>

        <Editor task={editing} onClose={() => setEditing(null)} />
      </main>

      {/* Floating Action Button for mobile quick actions */}
      <FloatingActionButton />

      {/* Focus Mode Styles - simplify UI when focus mode is active */}
      {focusMode && (
        <style>{`
          /* Reduce border widths from 4px/3px to 1px in focus mode */
          [data-focus-mode="true"] .border-4,
          [data-focus-mode="true"] .border-\\[4px\\],
          [data-focus-mode="true"] .border-\\[3px\\] {
            border-width: 1px !important;
          }
          
          /* Reduce shadows in focus mode */
          [data-focus-mode="true"] .shadow-\\[4px_4px_0px_0px_rgba\\(0\\,0\\,0\\,0\\.85\\)\\],
          [data-focus-mode="true"] .shadow-\\[6px_6px_0px_0px_rgba\\(0\\,0\\,0\\,0\\.85\\)\\] {
            box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
          }
          
          /* Remove punk textures in focus mode */
          [data-focus-mode="true"] .punk-shell::before,
          [data-focus-mode="true"] .punk-shell::after,
          [data-focus-mode="true"] .punk-canvas::before,
          [data-focus-mode="true"] .punk-canvas::after {
            display: none !important;
          }
        `}</style>
      )}
      
      {/* Toast notification container */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </StoreProvider>
  );
}
