import { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './Store';
import { Sidebar, Editor, Icon } from './Components';
import { ListView, CalendarView, GalleryView, TeamView, MiscView, ArchiveView, ActiveView, SettingsView } from './Views';
import { SongListView, SongDetailView, GlobalTasksView, ReleasesListView, ReleaseDetailView, CombinedTimelineView, TaskDashboardView, VideosView, FinancialsView, ProgressView, EventsListView, EventDetailView, ExpensesListView, ExpenseDetailView } from './SpecViews';
import { THEME, cn } from './utils';

function AppInner() {
  const [tab, setTab] = useState('songs');
  const [editing, setEditing] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const { data } = useStore();
  const settings = data.settings || {};
  const isDark = settings.themeMode === 'dark';

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

  return (
    <div
      className={cn(
        "flex h-screen overflow-hidden",
        THEME.punk.font,
        isDark ? "bg-slate-900 text-slate-50" : "bg-slate-50 text-slate-900"
      )}
    >
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        activeTab={tab}
        setActiveTab={(t) => { setTab(t); setSelectedSong(null); setSelectedRelease(null); setSelectedEvent(null); setSelectedExpense(null); }}
      />

      <main
        className={cn(
          "flex-1 flex flex-col min-w-0 relative ml-0 md:ml-64 transition-all duration-200",
          isDark ? "bg-slate-900" : "bg-slate-50"
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

        <div className="flex-1 overflow-y-auto pt-16 md:pt-0">
          {/* New Spec Views */}
          {tab === 'songs' && <SongListView onSelectSong={handleSelectSong} />}
          {tab === 'songDetail' && selectedSong && <SongDetailView song={selectedSong} onBack={() => { setSelectedSong(null); setTab('songs'); }} />}
          {tab === 'videos' && <VideosView onSelectSong={handleSelectSong} />}
          {tab === 'globalTasks' && <GlobalTasksView />}
          {tab === 'releases' && <ReleasesListView onSelectRelease={handleSelectRelease} />}
          {tab === 'releaseDetail' && selectedRelease && <ReleaseDetailView release={selectedRelease} onBack={() => { setSelectedRelease(null); setTab('releases'); }} />}
          {tab === 'timeline' && <CombinedTimelineView />}
          
          {/* Events Item Pages - Following unified Item/Page architecture */}
          {tab === 'events' && <EventsListView onSelectEvent={handleSelectEvent} />}
          {tab === 'eventDetail' && selectedEvent && <EventDetailView event={selectedEvent} onBack={() => { setSelectedEvent(null); setTab('events'); }} />}
          
          {/* Expenses Item Pages - Following unified Item/Page architecture */}
          {tab === 'expenses' && <ExpensesListView onSelectExpense={handleSelectExpense} />}
          {tab === 'expenseDetail' && selectedExpense && <ExpenseDetailView expense={selectedExpense} onBack={() => { setSelectedExpense(null); setTab('expenses'); }} />}
          
          {/* Task Dashboard - replaces confusing Plan view */}
          {tab === 'dashboard' && <TaskDashboardView />}
          
          {/* Financial and Progress Views */}
          {tab === 'financials' && <FinancialsView />}
          {tab === 'progress' && <ProgressView />}
          
          {/* Original Views */}
          {tab === 'list' && <ListView onEdit={setEditing} />}
          {tab === 'calendar' && <CalendarView onEdit={setEditing} />}
          {tab === 'gallery' && <GalleryView />}
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
