import { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './Store';
import { Sidebar, Editor, Icon } from './Components';
import { ListView, CalendarView, GalleryView, FilesView, TeamView, MiscView, ArchiveView, ActiveView, SettingsView } from './Views';
import { SongListView, SongDetailView, ReleasesListView, ReleaseDetailView, CombinedTimelineView, TaskDashboardView, FinancialsView, ProgressView, EventsListView, EventDetailView, ExpensesListView, ExpenseDetailView, VideosListView, VideoDetailView, GlobalTasksListView, GlobalTaskDetailView } from './SpecViews';
import { COLOR_VALUES, THEME, cn } from './utils';

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
      className={cn(
        "flex h-screen overflow-hidden punk-shell",
        THEME.punk.font,
        isDark ? "bg-slate-900 text-slate-50" : "bg-slate-50 text-slate-900"
      )}
    >
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        activeTab={tab}
        setActiveTab={(t) => { setTab(t); setSelectedSong(null); setSelectedRelease(null); setSelectedEvent(null); setSelectedExpense(null); setSelectedVideo(null); setSelectedGlobalTask(null); }}
      />

      <main
        className={cn(
          "flex-1 flex flex-col min-w-0 relative ml-0 md:ml-64 transition-all duration-200 punk-canvas",
          isDark ? "text-slate-50" : "text-slate-900"
        )}
      >
        {/* Mobile Menu Button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className={cn(
              "md:hidden fixed top-4 left-4 z-30 p-2 border-4 shadow-lg",
              isDark ? "bg-slate-800 text-slate-50 border-slate-600" : "bg-white text-slate-900 border-black"
            )}
          >
            <Icon name="Menu" />
          </button>
        )}

        {/* Feature 4: Era Mode Indicator Banner */}
        {eraModeActive && eraModeEra && (
          <div className={cn(
            "fixed top-0 left-0 md:left-64 right-0 z-20 px-4 py-2 flex items-center justify-between gap-4",
            "bg-yellow-400 border-b-4 border-black text-black"
          )}>
            <div className="flex items-center gap-2 font-bold text-sm">
              <span>🎯 ERA MODE:</span>
              <span style={{ color: eraModeEra.color || '#000' }}>{eraModeEra.name}</span>
            </div>
            <button 
              onClick={() => actions.saveSettings({ eraModeActive: false })}
              className="px-3 py-1 bg-black text-white text-xs font-bold hover:bg-gray-800"
            >
              Exit Era Mode
            </button>
          </div>
        )}

        <div className={cn("flex-1 overflow-y-auto pt-16 md:pt-0", eraModeActive && "pt-24 md:pt-10")}>
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
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  );
}
