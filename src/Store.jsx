import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc } from 'firebase/firestore';

const StoreContext = createContext();

export const useStore = () => useContext(StoreContext);

// Status enum for consistency across all entities
export const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Done', 'Delayed'];

// Song categories - DEPRECATED: Phase 0 removes category-based filtering
// Keeping for backwards compatibility but not used in new features
export const SONG_CATEGORIES = ['Album', 'Bonus', 'Christmas EP', 'EP', 'Other'];

// Video types - DEPRECATED: Use video type checkboxes on video entities instead
export const VIDEO_TYPES = ['None', 'Lyric', 'Enhanced', 'Enhanced + Loop', 'Full'];

// Unified Task schema factory - Phase 0 standardization
export const createUnifiedTask = (overrides = {}) => ({
  id: crypto.randomUUID(),
  type: overrides.type || 'Custom',
  category: overrides.category || 'Other',
  title: overrides.title || '',
  description: overrides.description || '',
  date: overrides.date || '',
  dueDate: overrides.dueDate || '',
  status: overrides.status || 'Not Started',
  // Cost layers with precedence: paidCost > quotedCost > estimatedCost
  estimatedCost: overrides.estimatedCost || 0,
  quotedCost: overrides.quotedCost || 0,
  paidCost: overrides.paidCost || 0,
  notes: overrides.notes || '',
  assignedMembers: overrides.assignedMembers || [],
  isOverridden: overrides.isOverridden || false,
  isArchived: overrides.isArchived || false,
  // Link to parent entity (song, version, video, release, event)
  parentType: overrides.parentType || null,
  parentId: overrides.parentId || null,
  ...overrides
});

// Resolve a task's due date while supporting legacy `date` fields
export const getTaskDueDate = (task = {}) => task.dueDate || task.date || '';

// Resolve the primary date for any item based on overrides, direct dates, and attached releases
export const getPrimaryDate = (item = {}, releases = [], extraReleaseIds = []) => {
  if (!item) return '';
  if (item.primary_date) return item.primary_date;
  if (item.primaryDate) return item.primaryDate;
  if (item.primaryDateOverride) return item.primaryDateOverride;
  if (item.releaseDate) return item.releaseDate;

  const overrideDates = item.releaseOverrides ? Object.values(item.releaseOverrides).filter(Boolean) : [];
  if (overrideDates.length > 0) return overrideDates.sort()[0];

  const collectedReleaseIds = [
    ...(item.coreReleaseId ? [item.coreReleaseId] : []),
    ...(item.releaseIds || []),
    ...extraReleaseIds
  ];

  const releaseDates = collectedReleaseIds
    .map(id => releases.find(r => r.id === id)?.releaseDate)
    .filter(Boolean)
    .sort();

  if (releaseDates.length > 0) return releaseDates[0];
  if (item.date) return item.date;
  if (item.exclusiveStartDate) return item.exclusiveStartDate;
  if (item.exclusiveEndDate) return item.exclusiveEndDate;
  return '';
};

// Compute effective cost with precedence: paid > quoted > estimated
export const getEffectiveCost = (entity = {}) => {
  if (entity.paidCost !== undefined && entity.paidCost > 0) return entity.paidCost;
  if (entity.quotedCost !== undefined && entity.quotedCost > 0) return entity.quotedCost;
  return entity.estimatedCost || 0;
};

// Exclusivity options for availability windows
export const EXCLUSIVITY_OPTIONS = ['None', 'Platform Exclusive', 'Website Only', 'Radio Only', 'Timed Exclusive'];

// Video types available for selection
export const VIDEO_TYPE_OPTIONS = [
  { key: 'lyric', label: 'Lyric Video' },
  { key: 'enhancedLyric', label: 'Enhanced Lyric' },
  { key: 'music', label: 'Music Video' },
  { key: 'visualizer', label: 'Visualizer' },
  { key: 'custom', label: 'Custom' }
];

// Task types for songs - comprehensive list
export const SONG_TASK_TYPES = [
  // Production Tasks
  { type: 'Arrangement', category: 'Production', daysBeforeRelease: 90, appliesTo: 'all' },
  { type: 'Demo', category: 'Production', daysBeforeRelease: 80, appliesTo: 'all' },
  { type: 'Vocal Recording', category: 'Recording', daysBeforeRelease: 60, appliesTo: 'all' },
  { type: 'Instrument Recording', category: 'Recording', daysBeforeRelease: 55, appliesTo: 'all' },
  { type: 'Mix', category: 'Post-Production', daysBeforeRelease: 42, appliesTo: 'all' },
  { type: 'Master', category: 'Post-Production', daysBeforeRelease: 21, appliesTo: 'all' },
  // Single-specific tasks
  { type: 'Artwork', category: 'Marketing', daysBeforeRelease: 28, appliesTo: 'single' },
  { type: 'DSP Upload', category: 'Distribution', daysBeforeRelease: 14, appliesTo: 'single' },
  { type: 'Radio/Playlist Push', category: 'Marketing', daysBeforeRelease: 7, appliesTo: 'single' },
  // Release task
  { type: 'Release', category: 'Distribution', daysBeforeRelease: 0, appliesTo: 'all' }
];

// Video task types - Phase 2 enhancement with auto-generated tasks
export const VIDEO_TASK_TYPES = [
  { type: 'Video Concept', category: 'Video', daysBeforeRelease: 45, videoTypes: ['music', 'Full'] },
  { type: 'Hire Crew', category: 'Video', daysBeforeRelease: 40, videoTypes: ['music', 'Full'] },
  { type: 'Video Shoot', category: 'Video', daysBeforeRelease: 35, videoTypes: ['music', 'Full'] },
  { type: 'Video Edit', category: 'Video', daysBeforeRelease: 25, videoTypes: ['music', 'Full', 'lyric', 'enhancedLyric', 'visualizer', 'Lyric', 'Enhanced', 'Enhanced + Loop'] },
  { type: 'Video Delivery', category: 'Video', daysBeforeRelease: 14, videoTypes: ['lyric', 'enhancedLyric', 'visualizer', 'Lyric', 'Enhanced', 'Enhanced + Loop'] },
  { type: 'Full Video Delivery', category: 'Video', daysBeforeRelease: 30, videoTypes: ['music', 'Full'] },
  { type: 'Video Release', category: 'Distribution', daysBeforeRelease: 0, videoTypes: ['lyric', 'enhancedLyric', 'music', 'visualizer', 'custom', 'Full', 'Lyric', 'Enhanced', 'Enhanced + Loop'] }
];

// Generate tasks for a video based on its type
export const generateVideoTasks = (releaseDate, videoTypeKey) => {
  if (!releaseDate) return [];
  
  const release = new Date(releaseDate);
  const tasks = [];
  
  VIDEO_TASK_TYPES.forEach(taskType => {
    if (taskType.videoTypes.includes(videoTypeKey)) {
      const taskDate = new Date(release);
      taskDate.setDate(taskDate.getDate() - taskType.daysBeforeRelease);
      
      tasks.push(createUnifiedTask({
        type: taskType.type,
        category: taskType.category,
        date: taskDate.toISOString().split('T')[0],
        dueDate: taskDate.toISOString().split('T')[0],
        parentType: 'video'
      }));
    }
  });
  
  // Sort by date
  tasks.sort((a, b) => a.date.localeCompare(b.date));
  
  return tasks;
};

// Release task types - auto-spawn when release is created
export const RELEASE_TASK_TYPES = [
  { type: 'Cover Art Design', category: 'Marketing', daysBeforeRelease: 45 },
  { type: 'Cover Art Approval', category: 'Marketing', daysBeforeRelease: 35 },
  { type: 'Album Reveal', category: 'Marketing', daysBeforeRelease: 14 },
  { type: 'Pre-order Setup', category: 'Distribution', daysBeforeRelease: 21 },
  { type: 'Metadata Submission', category: 'Distribution', daysBeforeRelease: 14 },
  { type: 'Release', category: 'Distribution', daysBeforeRelease: 0 }
];

// Deadline types (legacy - kept for compatibility)
export const DEADLINE_TYPES = ['Mix', 'Master', 'Artwork', 'Upload', 'VideoDelivery', 'Release'];

// Release types
export const RELEASE_TYPES = ['Album', 'EP', 'Remix EP', 'Deluxe', 'Other'];

// Version types for recording requirements
export const VERSION_TYPES = ['Album', 'Radio Edit', 'Acoustic', 'Extended', 'Loop Version', 'Remix', 'Instrumental', 'Clean'];

// Global task categories
export const GLOBAL_TASK_CATEGORIES = ['Branding', 'Web', 'Legal', 'Visuals', 'Marketing', 'Events', 'Audio', 'Video', 'Merch', 'Other'];

// Helper function to calculate task dates based on release date
export const calculateSongTasks = (releaseDate, isSingle, videoType) => {
  if (!releaseDate) return [];
  
  const release = new Date(releaseDate);
  const tasks = [];
  
  // Add production/recording tasks from SONG_TASK_TYPES
  SONG_TASK_TYPES.forEach(taskType => {
    // Skip single-specific tasks if not a single
    if (taskType.appliesTo === 'single' && !isSingle) return;
    
    const taskDate = new Date(release);
    taskDate.setDate(taskDate.getDate() - taskType.daysBeforeRelease);
    
    // Use unified task schema
    tasks.push(createUnifiedTask({
      type: taskType.type,
      category: taskType.category,
      date: taskDate.toISOString().split('T')[0],
      dueDate: taskDate.toISOString().split('T')[0],
      parentType: 'song'
    }));
  });
  
  // Add video tasks based on video type
  if (videoType && videoType !== 'None') {
    VIDEO_TASK_TYPES.forEach(taskType => {
      if (taskType.videoTypes.includes(videoType)) {
        const taskDate = new Date(release);
        taskDate.setDate(taskDate.getDate() - taskType.daysBeforeRelease);
        
        tasks.push(createUnifiedTask({
          type: taskType.type,
          category: taskType.category,
          date: taskDate.toISOString().split('T')[0],
          dueDate: taskDate.toISOString().split('T')[0],
          parentType: 'song'
        }));
      }
    });
  }
  
  // Sort by date
  tasks.sort((a, b) => a.date.localeCompare(b.date));
  
  return tasks;
};

// Legacy function - calls the new one for backwards compatibility
export const calculateDeadlines = (releaseDate, isSingle, videoType) => {
  return calculateSongTasks(releaseDate, isSingle, videoType);
};

// Helper function to calculate release tasks
export const calculateReleaseTasks = (releaseDate) => {
  if (!releaseDate) return [];
  
  const release = new Date(releaseDate);
  const tasks = [];
  
  RELEASE_TASK_TYPES.forEach(taskType => {
    const taskDate = new Date(release);
    taskDate.setDate(taskDate.getDate() - taskType.daysBeforeRelease);

    // Use unified task schema
    tasks.push(createUnifiedTask({
      type: taskType.type,
      category: taskType.category,
      date: taskDate.toISOString().split('T')[0],
      dueDate: taskDate.toISOString().split('T')[0],
      parentType: 'release'
    }));
  });
  
  // Sort by date
  tasks.sort((a, b) => a.date.localeCompare(b.date));
  
  return tasks;
};

// Recalculate deadlines from release date (only non-overridden ones)
export const recalculateDeadlines = (existingDeadlines, releaseDate, isSingle, videoType) => {
  if (!releaseDate) return existingDeadlines;
  
  const release = new Date(releaseDate);
  const newDeadlines = [...existingDeadlines];
  
  // Build offsets from SONG_TASK_TYPES and VIDEO_TASK_TYPES
  const offsets = {};
  SONG_TASK_TYPES.forEach(task => {
    if (task.appliesTo === 'all' || (task.appliesTo === 'single' && isSingle)) {
      offsets[task.type] = -task.daysBeforeRelease;
    }
  });
  VIDEO_TASK_TYPES.forEach(task => {
    if (videoType && task.videoTypes.includes(videoType)) {
      offsets[task.type] = -task.daysBeforeRelease;
    }
  });
  
  newDeadlines.forEach(deadline => {
    if (!deadline.isOverridden && deadline.status !== 'Done' && offsets[deadline.type] !== undefined) {
      const newDate = new Date(release);
      newDate.setDate(newDate.getDate() + offsets[deadline.type]);
      deadline.date = newDate.toISOString().split('T')[0];
      deadline.dueDate = newDate.toISOString().split('T')[0];
    }
  });
  
  return newDeadlines;
};

// Recalculate release tasks from release date
export const recalculateReleaseTasks = (existingTasks, releaseDate) => {
  if (!releaseDate) return existingTasks;
  
  const release = new Date(releaseDate);
  const newTasks = [...existingTasks];
  
  const offsets = {};
  RELEASE_TASK_TYPES.forEach(task => {
    offsets[task.type] = -task.daysBeforeRelease;
  });
  
  newTasks.forEach(task => {
    if (!task.isOverridden && task.status !== 'Done' && offsets[task.type] !== undefined) {
      const newDate = new Date(release);
      newDate.setDate(newDate.getDate() + offsets[task.type]);
      task.date = newDate.toISOString().split('T')[0];
      task.dueDate = newDate.toISOString().split('T')[0];
    }
  });
  
  return newTasks;
};

export const StoreProvider = ({ children }) => {
  const [mode, setMode] = useState('loading');
  const [data, setData] = useState({ 
    tasks: [],
    photos: [],
    vendors: [],
    teamMembers: [],
    misc: [],
    events: [],
    stages: [],
    settings: {},
    // New entities from spec
    songs: [],
    globalTasks: [],
    releases: [],
    // Phase 2: Standalone videos
    standaloneVideos: []
  });
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const appId = "album-tracker-v2";

  useEffect(() => {
    const init = async () => {
      const savedConfig = localStorage.getItem('at_firebase_config');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          const app = initializeApp(config);
          const auth = getAuth(app);
          const firestore = getFirestore(app);
          await signInAnonymously(auth);
          setUser(auth.currentUser);
          setDb(firestore);
          setMode('cloud');
          return;
        } catch (e) { console.error("Cloud Error", e); }
      }
      const localData = JSON.parse(localStorage.getItem(appId)) || {};
      setData(prev => ({ ...prev, ...localData }));
      setMode('local');
    };
    init();
  }, []);

  useEffect(() => {
    if (mode === 'cloud' && db && user) {
      const collections = [
        'album_tasks', 'album_photos', 'album_vendors', 'album_teamMembers', 'album_misc_expenses',
        'album_events', 'album_stages', 'album_songs', 'album_globalTasks', 'album_releases'
      ];
      const unsubs = collections.map(col => {
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, col));
        return onSnapshot(q, (snap) => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (col === 'album_tasks') {
             const settingsDoc = list.find(d => d.id === 'settings');
             const taskDocs = list.filter(d => d.id !== 'settings');
             setData(prev => ({ ...prev, tasks: taskDocs, settings: settingsDoc || prev.settings }));
          } else {
             const key = col.replace('album_', '').replace('_expenses', '');
             const mappedKey = key === 'task' ? 'tasks' : key === 'teamMembers' ? 'teamMembers' : key;
             setData(prev => ({ ...prev, [mappedKey]: list }));
          }
        });
      });
      return () => unsubs.forEach(u => u());
    } else if (mode === 'local') {
      localStorage.setItem(appId, JSON.stringify(data));
    }
  }, [data, mode, db, user]);

  useEffect(() => {
    if (mode === 'local' && (!data.stages || data.stages.length === 0)) {
        const defaults = [
          { id: 's1', name: "Stage 1: Arrangements", order: 1 },
          { id: 's2', name: "Stage 2: Pre-Production", order: 2 },
          { id: 's3', name: "Stage 3: Recording", order: 3 },
          { id: 's4', name: "Stage 4: Mixing/Mastering", order: 4 }
        ];
        setData(prev => ({ ...prev, stages: defaults }));
    }
  }, [mode, data.stages]);

    const stats = useMemo(() => {
    // Use getEffectiveCost directly for consistent cost calculation (paid > quoted > estimated)
    const costValue = getEffectiveCost;
    
    const visible = data.tasks.filter(t => !t.archived);
    let min = 0, max = 0, act = 0;
    const processNode = (nodeId) => {
        const children = visible.filter(t => t.parentId === nodeId);
        let pMin = 0, pMax = 0, pAct = 0;
        const t = visible.find(v => v.id === nodeId);
        const selfAct = t?.actualCost || 0;
        const selfEst = selfAct > 0 ? selfAct : (t?.quotedCost || t?.estimatedCost || 0);
        
        if (children.length === 0) {
             if (!t) return {min:0, max:0, act:0};
             return { min: (t.isOptional && !selfAct) ? 0 : selfEst, max: selfEst, act: selfAct };
        }
        const isChoice = t?.type === 'choice_group';
        if (isChoice) {
             const optionCosts = children.map(c => processNode(c.id));
             const selectedId = t.selectedOptionId;
             if (selectedId) {
                 const selectedCost = optionCosts.find((_, i) => children[i].id === selectedId);
                 if (selectedCost) { pMin = selectedCost.min; pMax = selectedCost.max; pAct = selectedCost.act; }
             } else if (optionCosts.length > 0) {
                 pMin = Math.min(...optionCosts.map(c => c.min));
                 pMax = Math.max(...optionCosts.map(c => c.max));
                 pAct = 0; 
             }
        } else {
             children.forEach(c => {
                 const cStats = processNode(c.id);
                 pMin += cStats.min; pMax += cStats.max; pAct += cStats.act;
             });
        }
        if (t) pAct += (t.actualCost || 0);
        return { min: pMin + selfEst, max: pMax + selfEst, act: pAct + selfAct };
    };
    visible.filter(t => !t.parentId).forEach(t => {
        const nodeStats = processNode(t.id);
        min += nodeStats.min; max += nodeStats.max; act += nodeStats.act;
    });
    const miscTotal = (data.misc || []).reduce((s, i) => s + (i.amount || 0), 0);
    
    // Calculate totals from new entities (songs, globalTasks, releases)
    let songsTotal = 0;
    let globalTasksTotal = 0;
    let releasesTotal = 0;
    
    (data.songs || []).forEach(song => {
      songsTotal += costValue(song);
      (song.deadlines || []).forEach(d => { songsTotal += costValue(d); });
      (song.customTasks || []).forEach(t => { songsTotal += costValue(t); });
      (song.versions || []).forEach(v => { songsTotal += costValue(v); });
    });

    (data.globalTasks || []).forEach(t => { globalTasksTotal += costValue(t); });
    (data.releases || []).forEach(r => { releasesTotal += costValue(r); });
    
    const newEntitiesTotal = songsTotal + globalTasksTotal + releasesTotal;
    
    return { 
      min: min + miscTotal, 
      max: max + miscTotal, 
      act: act + miscTotal,
      songsTotal,
      globalTasksTotal,
      releasesTotal,
      grandTotal: min + miscTotal + newEntitiesTotal
    };
  }, [data.tasks, data.misc, data.songs, data.globalTasks, data.releases]);

  const actions = {
     add: async (col, item) => {
        const colKey = col === 'misc_expenses' ? 'misc' : col;
        if (mode === 'cloud') await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, `album_${col}`), { ...item, createdAt: serverTimestamp() });
        else setData(p => ({...p, [colKey]: [...(p[colKey] || []), {id:crypto.randomUUID(), ...item}]}));
     },
     update: async (col, id, item) => {
         const colKey = col === 'misc_expenses' ? 'misc' : col;
         if (mode === 'cloud') await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, `album_${col}`, id), item);
         else setData(p => {
             return {...p, [colKey]: (p[colKey] || []).map(i => i.id === id ? { ...i, ...item } : i)};
         });
     },
     delete: async (col, id) => {
         const colKey = col === 'misc_expenses' ? 'misc' : col;
         if (mode === 'cloud') await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, `album_${col}`, id));
         else setData(p => {
             return {...p, [colKey]: (p[colKey] || []).filter(i => i.id !== id)};
         });
     },
     saveSettings: async (newSettings) => {
         if (mode === 'cloud') await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_tasks', 'settings'), newSettings, { merge: true });
         else setData(p => ({...p, settings: {...p.settings, ...newSettings}}));
     },
     connectCloud: (config) => { localStorage.setItem('at_firebase_config', JSON.stringify(config)); window.location.reload(); },
     disconnect: () => { localStorage.removeItem('at_firebase_config'); window.location.reload(); },

     // Phase 5: Enhanced event actions with custom tasks
     addEventCustomTask: async (eventId, task) => {
       const newTask = createUnifiedTask({
         type: 'Custom',
         title: task.title || 'New Task',
         description: task.description || '',
         date: task.date || '',
         status: task.status || 'Not Started',
         estimatedCost: task.estimatedCost || 0,
         quotedCost: task.quotedCost || 0,
         paidCost: task.paidCost || 0,
         notes: task.notes || '',
         parentType: 'event',
         parentId: eventId
       });
       if (mode === 'cloud') {
         const event = data.events.find(e => e.id === eventId);
         if (event) {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_events', eventId), {
             customTasks: [...(event.customTasks || []), newTask]
           });
         }
       } else {
         setData(p => ({
           ...p,
           events: (p.events || []).map(e => e.id === eventId ? { ...e, customTasks: [...(e.customTasks || []), newTask] } : e)
         }));
       }
       return newTask;
     },

     updateEventCustomTask: async (eventId, taskId, updates) => {
       if (mode === 'cloud') {
         const event = data.events.find(e => e.id === eventId);
         if (event) {
           const updatedTasks = (event.customTasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_events', eventId), { customTasks: updatedTasks });
         }
       } else {
         setData(p => ({
           ...p,
           events: (p.events || []).map(e => e.id === eventId ? {
             ...e,
             customTasks: (e.customTasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t)
           } : e)
         }));
       }
     },

     deleteEventCustomTask: async (eventId, taskId) => {
       if (mode === 'cloud') {
         const event = data.events.find(e => e.id === eventId);
         if (event) {
           const updatedTasks = (event.customTasks || []).filter(t => t.id !== taskId);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_events', eventId), { customTasks: updatedTasks });
         }
       } else {
         setData(p => ({
           ...p,
           events: (p.events || []).map(e => e.id === eventId ? {
             ...e,
             customTasks: (e.customTasks || []).filter(t => t.id !== taskId)
           } : e)
         }));
       }
     },

     addStage: async (stage) => {
       const newStage = { id: crypto.randomUUID(), name: stage.name || 'New Stage', order: stage.order || (data.stages.length + 1) };
       if (mode === 'cloud') {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_stages'), { ...newStage, createdAt: serverTimestamp() });
       } else {
         setData(p => ({ ...p, stages: [...(p.stages || []), newStage] }));
       }
       return newStage;
     },

     updateStage: async (stageId, updates) => {
       if (mode === 'cloud') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_stages', stageId), updates);
       } else {
         setData(p => ({ ...p, stages: (p.stages || []).map(s => s.id === stageId ? { ...s, ...updates } : s) }));
       }
     },

     deleteStage: async (stageId) => {
       if (mode === 'cloud') {
         await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_stages', stageId));
       } else {
         setData(p => ({ ...p, stages: (p.stages || []).filter(s => s.id !== stageId) }));
       }
     },

     addTeamMember: async (member) => {
       const newMember = {
         id: crypto.randomUUID(),
         name: member.name || 'New Member',
         phone: member.phone || '',
         email: member.email || '',
         role: member.role || '',
         notes: member.notes || '',
         type: member.type || 'individual',
         companyId: member.companyId || '',
         instruments: member.instruments || [],
         costs: member.costs || {}
       };
       if (mode === 'cloud') {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_teamMembers'), { ...newMember, createdAt: serverTimestamp() });
       } else {
         setData(p => ({...p, teamMembers: [...(p.teamMembers || []), newMember]}));
       }
       return newMember;
     },

     updateTeamMember: async (memberId, updates) => {
       if (mode === 'cloud') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_teamMembers', memberId), updates);
       } else {
         setData(p => ({
           ...p,
           teamMembers: (p.teamMembers || []).map(m => m.id === memberId ? { ...m, ...updates } : m)
         }));
       }
     },

     deleteTeamMember: async (memberId) => {
       if (mode === 'cloud') {
         await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_teamMembers', memberId));
       } else {
         setData(p => ({...p, teamMembers: (p.teamMembers || []).filter(m => m.id !== memberId)}));
       }
     },
     
     // Song-specific actions
     addSong: async (song) => {
       const deadlines = calculateDeadlines(song.releaseDate, song.isSingle, song.videoType);
     const newSong = {
        id: crypto.randomUUID(),
        title: song.title || 'New Song',
        // DEPRECATED: category field kept for backwards compatibility
        category: song.category || 'Album',
        releaseDate: song.releaseDate || '',
        coreReleaseId: song.coreReleaseId || '',
        isSingle: song.isSingle || false,
        videoType: song.videoType || 'None',
        stemsNeeded: song.stemsNeeded || false,
        // Cost layers with precedence: paidCost > quotedCost > estimatedCost
        estimatedCost: song.estimatedCost || 0,
        quotedCost: song.quotedCost || 0,
        paidCost: song.paidCost || 0,
        // Availability windows for exclusivity
        exclusiveType: song.exclusiveType || 'None',
        exclusiveStartDate: song.exclusiveStartDate || '',
        exclusiveEndDate: song.exclusiveEndDate || '',
        exclusiveNotes: song.exclusiveNotes || '',
        instruments: song.instruments || [],
        musicians: song.musicians || [],
        deadlines: deadlines,
        customTasks: [],
        versions: [
          {
            id: 'core',
            name: 'Core Version',
            releaseIds: song.coreReleaseId ? [song.coreReleaseId] : [],
            releaseOverrides: {},
            exclusiveType: song.exclusiveType || 'None',
            exclusiveStartDate: song.exclusiveStartDate || '',
            exclusiveEndDate: song.exclusiveEndDate || '',
            exclusiveNotes: song.exclusiveNotes || '',
            instruments: song.instruments || [],
            musicians: song.musicians || [],
            // Cost layers
            estimatedCost: 0,
            quotedCost: 0,
            paidCost: 0,
            basedOnCore: true
          }
        ],
        videos: []
      };
       if (mode === 'cloud') {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_songs'), { ...newSong, createdAt: serverTimestamp() });
       } else {
         setData(p => ({...p, songs: [...(p.songs || []), newSong]}));
       }
       return newSong;
     },
     
     updateSong: async (songId, updates) => {
       if (mode === 'cloud') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), updates);
       } else {
         setData(p => ({
           ...p, 
           songs: (p.songs || []).map(s => s.id === songId ? { ...s, ...updates } : s)
         }));
       }
     },
     
     deleteSong: async (songId) => {
       if (mode === 'cloud') {
         await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId));
       } else {
         setData(p => ({...p, songs: (p.songs || []).filter(s => s.id !== songId)}));
       }
     },
     
     // Add custom task to a song
     addSongCustomTask: async (songId, task) => {
       // Use unified task schema with cost layers
       const newTask = createUnifiedTask({
         type: 'Custom',
         title: task.title || 'New Task',
         description: task.description || '',
         date: task.date || '',
         status: task.status || 'Not Started',
         // Cost layers with precedence
         estimatedCost: task.estimatedCost || 0,
         quotedCost: task.quotedCost || 0,
         paidCost: task.paidCost || 0,
         notes: task.notes || '',
         parentType: 'song',
         parentId: songId
       });
       if (mode === 'cloud') {
         // For cloud mode, we need to update the song document
         const song = data.songs.find(s => s.id === songId);
         if (song) {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), {
             customTasks: [...(song.customTasks || []), newTask]
           });
         }
       } else {
         setData(p => ({
           ...p,
           songs: (p.songs || []).map(s => s.id === songId ? { ...s, customTasks: [...(s.customTasks || []), newTask] } : s)
         }));
       }
       return newTask;
     },
     
     updateSongCustomTask: async (songId, taskId, updates) => {
       if (mode === 'cloud') {
         const song = data.songs.find(s => s.id === songId);
         if (song) {
           const updatedTasks = (song.customTasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { customTasks: updatedTasks });
         }
       } else {
         setData(p => ({
           ...p,
           songs: (p.songs || []).map(s => s.id === songId ? {
             ...s,
             customTasks: (s.customTasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t)
           } : s)
         }));
       }
     },
     
    deleteSongCustomTask: async (songId, taskId) => {
      if (mode === 'cloud') {
        const song = data.songs.find(s => s.id === songId);
        if (song) {
          const updatedTasks = (song.customTasks || []).filter(t => t.id !== taskId);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { customTasks: updatedTasks });
         }
       } else {
         setData(p => ({
           ...p,
           songs: (p.songs || []).map(s => s.id === songId ? {
             ...s,
             customTasks: (s.customTasks || []).filter(t => t.id !== taskId)
           } : s)
         }));
      }
    },

    addSongMusician: async (songId, musician) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => song.id === songId ? {
          ...song,
          musicians: [...(song.musicians || []), musician]
        } : song)
      }));
    },

    removeSongMusician: async (songId, musicianId) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => song.id === songId ? {
          ...song,
          musicians: (song.musicians || []).filter(m => m.id !== musicianId)
        } : song)
      }));
    },

    addVersionMusician: async (songId, versionId, musician) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => {
          if (song.id !== songId) return song;
          const updatedVersions = (song.versions || []).map(v => v.id === versionId ? { ...v, musicians: [...(v.musicians || []), musician] } : v);
          return { ...song, versions: updatedVersions };
        })
      }));
    },

    removeVersionMusician: async (songId, versionId, musicianId) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => {
          if (song.id !== songId) return song;
          const updatedVersions = (song.versions || []).map(v => v.id === versionId ? { ...v, musicians: (v.musicians || []).filter(m => m.id !== musicianId) } : v);
          return { ...song, versions: updatedVersions };
        })
      }));
    },

    // Version helpers - Phase 1: Enhanced version management
    addSongVersion: async (songId, baseData = null) => {
      const song = data.songs.find(s => s.id === songId);
      if (!song) return null;
      const coreVersion = song.versions?.find(v => v.id === 'core') || {};
      const template = baseData || coreVersion;
      
      // Generate version-specific tasks (arrangement, mix, master, release)
      const generateVersionTasks = (releaseDate) => {
        if (!releaseDate) return [];
        const versionTaskTypes = [
          { type: 'Arrangement', category: 'Production', daysBeforeRelease: 60 },
          { type: 'Instrumentation', category: 'Production', daysBeforeRelease: 50 },
          { type: 'Mix', category: 'Post-Production', daysBeforeRelease: 30 },
          { type: 'Master', category: 'Post-Production', daysBeforeRelease: 14 },
          { type: 'Release', category: 'Distribution', daysBeforeRelease: 0 }
        ];
        const release = new Date(releaseDate);
        return versionTaskTypes.map(taskType => {
          const taskDate = new Date(release);
          taskDate.setDate(taskDate.getDate() - taskType.daysBeforeRelease);
          return createUnifiedTask({
            type: taskType.type,
            category: taskType.category,
            date: taskDate.toISOString().split('T')[0],
            parentType: 'version'
          });
        });
      };
      
      const versionReleaseDate = baseData?.releaseDate || song.releaseDate || '';
      const versionTasks = generateVersionTasks(versionReleaseDate);
      
      const newVersion = {
        id: crypto.randomUUID(),
        name: baseData?.name || `${song.title} Alt`,
        // Multi-release linking
        releaseIds: [...(template.releaseIds || [])],
        releaseOverrides: { ...(template.releaseOverrides || {}) },
        // Version-specific release date
        releaseDate: versionReleaseDate,
        // Availability windows
        exclusiveType: template.exclusiveType || 'None',
        exclusiveStartDate: template.exclusiveStartDate || '',
        exclusiveEndDate: template.exclusiveEndDate || '',
        exclusiveNotes: template.exclusiveNotes || '',
        // Instruments and musicians
        instruments: [...(template.instruments || [])],
        musicians: [...(template.musicians || [])],
        // Cost layers
        estimatedCost: template.estimatedCost || 0,
        quotedCost: template.quotedCost || 0,
        paidCost: template.paidCost || 0,
        // Core inheritance
        basedOnCore: baseData?.basedOnCore !== undefined ? baseData.basedOnCore : true,
        // Video type selections (copied from template)
        videoTypes: { ...(template.videoTypes || { lyric: false, enhancedLyric: false, music: false, visualizer: false, custom: false }) },
        // Version-specific tasks (auto-generated)
        tasks: versionTasks,
        customTasks: []
      };

      const saveVersions = (versions) => {
        if (mode === 'cloud') {
          updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { versions });
        } else {
          setData(p => ({
            ...p,
            songs: (p.songs || []).map(s => s.id === songId ? { ...s, versions } : s)
          }));
        }
      };

      const updatedVersions = [...(song.versions || []), newVersion];
      saveVersions(updatedVersions);
      return newVersion;
    },

    updateSongVersion: async (songId, versionId, updates) => {
      const song = data.songs.find(s => s.id === songId);
      if (!song) return;
      const updatedVersions = (song.versions || []).map(v => v.id === versionId ? { ...v, ...updates } : v);
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { versions: updatedVersions });
      } else {
        setData(p => ({
          ...p,
          songs: (p.songs || []).map(s => s.id === songId ? { ...s, versions: updatedVersions } : s)
        }));
      }
    },

    attachVersionToRelease: async (songId, versionId, releaseId, releaseDate) => {
      const song = data.songs.find(s => s.id === songId);
      if (!song) return;
      const updatedVersions = (song.versions || []).map(v => {
        if (v.id !== versionId) return v;
        const releaseIds = v.releaseIds?.includes(releaseId) ? v.releaseIds : [...(v.releaseIds || []), releaseId];
        const releaseOverrides = { ...(v.releaseOverrides || {}) };
        if (releaseDate) {
          releaseOverrides[releaseId] = releaseDate;
        }
        return { ...v, releaseIds, releaseOverrides };
      });
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { versions: updatedVersions });
      } else {
        setData(p => ({
          ...p,
          songs: (p.songs || []).map(s => s.id === songId ? { ...s, versions: updatedVersions } : s)
        }));
      }
    },

    // Detach a version from a release (Phase 4: ability to decouple/unlink releases from versions)
    detachVersionFromRelease: async (songId, versionId, releaseId) => {
      const song = data.songs.find(s => s.id === songId);
      if (!song) return;
      const updatedVersions = (song.versions || []).map(v => {
        if (v.id !== versionId) return v;
        const releaseIds = (v.releaseIds || []).filter(id => id !== releaseId);
        const releaseOverrides = { ...(v.releaseOverrides || {}) };
        delete releaseOverrides[releaseId];
        return { ...v, releaseIds, releaseOverrides };
      });
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { versions: updatedVersions });
      } else {
        setData(p => ({
          ...p,
          songs: (p.songs || []).map(s => s.id === songId ? { ...s, versions: updatedVersions } : s)
        }));
      }
    },

    // Delete a song version (except core)
    deleteSongVersion: async (songId, versionId) => {
      if (versionId === 'core') return; // Cannot delete core version
      const song = data.songs.find(s => s.id === songId);
      if (!song) return;
      const updatedVersions = (song.versions || []).filter(v => v.id !== versionId);
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { versions: updatedVersions });
      } else {
        setData(p => ({
          ...p,
          songs: (p.songs || []).map(s => s.id === songId ? { ...s, versions: updatedVersions } : s)
        }));
      }
    },

    // Update a task on a song version
    updateVersionTask: async (songId, versionId, taskId, updates) => {
      const song = data.songs.find(s => s.id === songId);
      if (!song) return;
      const updatedVersions = (song.versions || []).map(v => {
        if (v.id !== versionId) return v;
        const updatedTasks = (v.tasks || []).map(t => t.id === taskId ? { ...t, ...updates, isOverridden: true } : t);
        return { ...v, tasks: updatedTasks };
      });
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { versions: updatedVersions });
      } else {
        setData(p => ({
          ...p,
          songs: (p.songs || []).map(s => s.id === songId ? { ...s, versions: updatedVersions } : s)
        }));
      }
    },

    // Add custom task to a song version
    addVersionCustomTask: async (songId, versionId, task) => {
      const song = data.songs.find(s => s.id === songId);
      if (!song) return;
      const newTask = createUnifiedTask({
        type: 'Custom',
        title: task.title || 'New Task',
        description: task.description || '',
        date: task.date || '',
        dueDate: task.date || task.dueDate || '',
        status: task.status || 'Not Started',
        estimatedCost: task.estimatedCost || 0,
        quotedCost: task.quotedCost || 0,
        paidCost: task.paidCost || 0,
        notes: task.notes || '',
        parentType: 'version',
        parentId: versionId
      });
      const updatedVersions = (song.versions || []).map(v => {
        if (v.id !== versionId) return v;
        return { ...v, customTasks: [...(v.customTasks || []), newTask] };
      });
      if (mode === 'cloud') {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { versions: updatedVersions });
      } else {
        setData(p => ({
          ...p,
          songs: (p.songs || []).map(s => s.id === songId ? { ...s, versions: updatedVersions } : s)
        }));
      }
      return newTask;
    },
     
     // Update a song deadline
     updateSongDeadline: async (songId, deadlineId, updates) => {
       // Mark as overridden if date is being updated
       const finalUpdates = updates.date !== undefined ? { ...updates, isOverridden: true } : updates;
       if (mode === 'cloud') {
         const song = data.songs.find(s => s.id === songId);
         if (song) {
           const updatedDeadlines = (song.deadlines || []).map(d => d.id === deadlineId ? { ...d, ...finalUpdates } : d);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { deadlines: updatedDeadlines });
         }
       } else {
         setData(p => ({
           ...p,
           songs: (p.songs || []).map(s => s.id === songId ? {
             ...s,
             deadlines: (s.deadlines || []).map(d => d.id === deadlineId ? { ...d, ...finalUpdates } : d)
           } : s)
         }));
       }
     },
     
     // Recalculate song deadlines from release date
     recalculateSongDeadlines: async (songId) => {
       const song = data.songs.find(s => s.id === songId);
       if (song && song.releaseDate) {
         let newDeadlines;
         // If no deadlines exist, create them from scratch
         if (!song.deadlines || song.deadlines.length === 0) {
           newDeadlines = calculateDeadlines(song.releaseDate, song.isSingle, song.videoType);
         } else {
           // Recalculate existing deadlines
           newDeadlines = recalculateDeadlines(song.deadlines, song.releaseDate, song.isSingle, song.videoType);
         }
         if (mode === 'cloud') {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_songs', songId), { deadlines: newDeadlines });
         } else {
           setData(p => ({
             ...p,
             songs: (p.songs || []).map(s => s.id === songId ? { ...s, deadlines: newDeadlines } : s)
           }));
         }
       }
     },
     
     // Global task actions
     addGlobalTask: async (task) => {
       // Use unified task schema with cost layers
       const newTask = createUnifiedTask({
         type: 'Global',
         title: task.taskName || 'New Task',
         taskName: task.taskName || 'New Task',
         category: task.category || 'Other',
         date: task.date || '',
         description: task.description || '',
         assignedTo: task.assignedTo || '',
         status: task.status || 'Not Started',
         // Cost layers with precedence
         estimatedCost: task.estimatedCost || 0,
         quotedCost: task.quotedCost || 0,
         paidCost: task.paidCost || 0,
         notes: task.notes || '',
         parentType: 'global'
       });
       if (mode === 'cloud') {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_globalTasks'), { ...newTask, createdAt: serverTimestamp() });
       } else {
         setData(p => ({...p, globalTasks: [...(p.globalTasks || []), newTask]}));
       }
       return newTask;
     },
     
     updateGlobalTask: async (taskId, updates) => {
       if (mode === 'cloud') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_globalTasks', taskId), updates);
       } else {
         setData(p => ({
           ...p,
           globalTasks: (p.globalTasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t)
         }));
       }
     },
     
     deleteGlobalTask: async (taskId) => {
       if (mode === 'cloud') {
         await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_globalTasks', taskId));
       } else {
         setData(p => ({...p, globalTasks: (p.globalTasks || []).filter(t => t.id !== taskId)}));
       }
     },
     
     // Release actions - Phase 3 enhancement
     addRelease: async (release) => {
       // Auto-spawn release tasks based on release date
       const releaseTasks = calculateReleaseTasks(release.releaseDate);
       
       const newRelease = {
         id: crypto.randomUUID(),
         name: release.name || 'New Release',
        type: release.type || 'Album',
        releaseDate: release.releaseDate || '',
        // Cost layers with precedence: paidCost > quotedCost > estimatedCost
        estimatedCost: release.estimatedCost || 0,
        quotedCost: release.quotedCost || 0,
        paidCost: release.paidCost || 0,
        notes: release.notes || '',
        // Availability windows for exclusivity
        exclusiveType: release.exclusiveType || 'None',
        exclusiveStartDate: release.exclusiveStartDate || '',
        exclusiveEndDate: release.exclusiveEndDate || '',
        exclusiveNotes: release.exclusiveNotes || '',
        hasPhysicalCopies: release.hasPhysicalCopies || false,
        requiredRecordings: [],
        tasks: releaseTasks,  // Auto-spawned tasks
        // Phase 3: Custom tasks on releases
        customTasks: [],
        // Phase 3: Attached content (songs, versions, videos)
        attachedSongIds: release.attachedSongIds || [],
        attachedVersions: release.attachedVersions || [], // [{songId, versionId}]
        attachedVideoIds: release.attachedVideoIds || [],
        attachedStandaloneVideoIds: release.attachedStandaloneVideoIds || []
      };
       if (mode === 'cloud') {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_releases'), { ...newRelease, createdAt: serverTimestamp() });
       } else {
         setData(p => ({...p, releases: [...(p.releases || []), newRelease]}));
       }
       return newRelease;
     },
     
    updateRelease: async (releaseId, updates) => {
      const applyReleaseSync = (releaseDate) => {
        if (!releaseDate) return;
        setData(prev => {
          const updatedSongs = (prev.songs || []).map(song => {
            const touchesRelease = song.coreReleaseId === releaseId || (song.versions || []).some(v => (v.releaseIds || []).includes(releaseId));
            if (!touchesRelease) return song;
            const updatedVersions = (song.versions || []).map(v => {
              if (!(v.releaseIds || []).includes(releaseId)) return v;
              const existing = v.releaseOverrides?.[releaseId];
              const earliest = existing && existing < releaseDate ? existing : releaseDate;
              const releaseOverrides = { ...(v.releaseOverrides || {}), [releaseId]: earliest };
              return { ...v, releaseOverrides };
            });
            const effectiveSongDate = song.releaseDate && song.releaseDate <= releaseDate ? song.releaseDate : releaseDate;
            const updatedDeadlines = song.releaseDate
              ? recalculateDeadlines(song.deadlines || [], effectiveSongDate, song.isSingle, song.videoType)
              : song.deadlines;
            return { ...song, releaseDate: effectiveSongDate, versions: updatedVersions, deadlines: updatedDeadlines };
          });
          const updatedReleases = (prev.releases || []).map(r => {
            if (r.id !== releaseId) return r;
            const tasks = recalculateReleaseTasks(r.tasks || [], releaseDate);
            return { ...r, releaseDate, tasks };
          });
          return { ...prev, songs: updatedSongs, releases: updatedReleases };
        });
      };

      if (mode === 'cloud') {
        const release = data.releases.find(r => r.id === releaseId);
        const recalculatedTasks = updates.releaseDate ? recalculateReleaseTasks(release?.tasks || [], updates.releaseDate) : undefined;
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), {
          ...updates,
          ...(recalculatedTasks ? { tasks: recalculatedTasks } : {})
        });
        if (updates.releaseDate) applyReleaseSync(updates.releaseDate);
      } else {
        if (updates.releaseDate) {
          applyReleaseSync(updates.releaseDate);
        } else {
          setData(p => ({
            ...p,
            releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, ...updates } : r)
          }));
        }
      }
    },
     
     deleteRelease: async (releaseId) => {
       if (mode === 'cloud') {
         await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId));
       } else {
         setData(p => ({...p, releases: (p.releases || []).filter(r => r.id !== releaseId)}));
       }
     },
     
     // Add recording requirement to release
     addRecordingRequirement: async (releaseId, requirement) => {
       const newReq = {
         id: crypto.randomUUID(),
         releaseId,
         songId: requirement.songId || '',
         versionType: requirement.versionType || 'Album',
         status: requirement.status || 'Not Started',
         notes: requirement.notes || ''
       };
       if (mode === 'cloud') {
         const release = data.releases.find(r => r.id === releaseId);
         if (release) {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), {
             requiredRecordings: [...(release.requiredRecordings || []), newReq]
           });
         }
       } else {
         setData(p => ({
           ...p,
           releases: (p.releases || []).map(r => r.id === releaseId ? {
             ...r,
             requiredRecordings: [...(r.requiredRecordings || []), newReq]
           } : r)
         }));
       }
       return newReq;
     },
     
     updateRecordingRequirement: async (releaseId, reqId, updates) => {
       if (mode === 'cloud') {
         const release = data.releases.find(r => r.id === releaseId);
         if (release) {
           const updatedReqs = (release.requiredRecordings || []).map(req => req.id === reqId ? { ...req, ...updates } : req);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { requiredRecordings: updatedReqs });
         }
       } else {
         setData(p => ({
           ...p,
           releases: (p.releases || []).map(r => r.id === releaseId ? {
             ...r,
             requiredRecordings: (r.requiredRecordings || []).map(req => req.id === reqId ? { ...req, ...updates } : req)
           } : r)
         }));
       }
     },
     
     deleteRecordingRequirement: async (releaseId, reqId) => {
       if (mode === 'cloud') {
         const release = data.releases.find(r => r.id === releaseId);
         if (release) {
           const updatedReqs = (release.requiredRecordings || []).filter(req => req.id !== reqId);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { requiredRecordings: updatedReqs });
         }
       } else {
         setData(p => ({
           ...p,
           releases: (p.releases || []).map(r => r.id === releaseId ? {
             ...r,
             requiredRecordings: (r.requiredRecordings || []).filter(req => req.id !== reqId)
           } : r)
         }));
       }
     },
     
     // Update a release task
    updateReleaseTask: async (releaseId, taskId, updates) => {
      const finalUpdates = updates.date !== undefined ? { ...updates, isOverridden: true } : updates;
      if (mode === 'cloud') {
        const release = data.releases.find(r => r.id === releaseId);
        if (release) {
           const updatedTasks = (release.tasks || []).map(t => t.id === taskId ? { ...t, ...finalUpdates } : t);
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { tasks: updatedTasks });
         }
       } else {
         setData(p => ({
           ...p,
           releases: (p.releases || []).map(r => r.id === releaseId ? {
             ...r,
             tasks: (r.tasks || []).map(t => t.id === taskId ? { ...t, ...finalUpdates } : t)
           } : r)
        }));
      }
    },

    // Phase 3: Add custom task to a release
    addReleaseCustomTask: async (releaseId, task) => {
      const newTask = createUnifiedTask({
        type: 'Custom',
        title: task.title || 'New Task',
        description: task.description || '',
        date: task.date || '',
        dueDate: task.date || task.dueDate || '',
        status: task.status || 'Not Started',
        estimatedCost: task.estimatedCost || 0,
        quotedCost: task.quotedCost || 0,
        paidCost: task.paidCost || 0,
        notes: task.notes || '',
        parentType: 'release',
        parentId: releaseId
      });
      const release = data.releases.find(r => r.id === releaseId);
      if (release) {
        const updatedCustomTasks = [...(release.customTasks || []), newTask];
        if (mode === 'cloud') {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { customTasks: updatedCustomTasks });
        } else {
          setData(p => ({
            ...p,
            releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, customTasks: updatedCustomTasks } : r)
          }));
        }
      }
      return newTask;
    },

    // Phase 3: Update custom task on a release
    updateReleaseCustomTask: async (releaseId, taskId, updates) => {
      const release = data.releases.find(r => r.id === releaseId);
      if (release) {
        const updatedCustomTasks = (release.customTasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t);
        if (mode === 'cloud') {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { customTasks: updatedCustomTasks });
        } else {
          setData(p => ({
            ...p,
            releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, customTasks: updatedCustomTasks } : r)
          }));
        }
      }
    },

    // Phase 3: Delete custom task from a release
    deleteReleaseCustomTask: async (releaseId, taskId) => {
      const release = data.releases.find(r => r.id === releaseId);
      if (release) {
        const updatedCustomTasks = (release.customTasks || []).filter(t => t.id !== taskId);
        if (mode === 'cloud') {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { customTasks: updatedCustomTasks });
        } else {
          setData(p => ({
            ...p,
            releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, customTasks: updatedCustomTasks } : r)
          }));
        }
      }
    },

    // Phase 3: Attach song to release
    attachSongToRelease: async (releaseId, songId) => {
      const release = data.releases.find(r => r.id === releaseId);
      if (release && !release.attachedSongIds?.includes(songId)) {
        const updatedAttachedSongIds = [...(release.attachedSongIds || []), songId];
        if (mode === 'cloud') {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { attachedSongIds: updatedAttachedSongIds });
        } else {
          setData(p => ({
            ...p,
            releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, attachedSongIds: updatedAttachedSongIds } : r)
          }));
        }
      }
    },

    // Phase 3: Detach song from release
    detachSongFromRelease: async (releaseId, songId) => {
      const release = data.releases.find(r => r.id === releaseId);
      if (release) {
        const updatedAttachedSongIds = (release.attachedSongIds || []).filter(id => id !== songId);
        if (mode === 'cloud') {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { attachedSongIds: updatedAttachedSongIds });
        } else {
          setData(p => ({
            ...p,
            releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, attachedSongIds: updatedAttachedSongIds } : r)
          }));
        }
      }
    },

    // Phase 3: Auto-calculate release date from earliest attached content
    autoCalculateReleaseDateFromContent: async (releaseId) => {
      const release = data.releases.find(r => r.id === releaseId);
      if (!release) return;
      
      let earliestDate = null;
      
      // Check attached songs
      (release.attachedSongIds || []).forEach(songId => {
        const song = data.songs.find(s => s.id === songId);
        if (song?.releaseDate && (!earliestDate || song.releaseDate < earliestDate)) {
          earliestDate = song.releaseDate;
        }
      });
      
      // Check attached versions
      (release.attachedVersions || []).forEach(({ songId, versionId }) => {
        const song = data.songs.find(s => s.id === songId);
        const version = song?.versions?.find(v => v.id === versionId);
        if (version?.releaseDate && (!earliestDate || version.releaseDate < earliestDate)) {
          earliestDate = version.releaseDate;
        }
      });
      
      if (earliestDate && (!release.releaseDate || earliestDate !== release.releaseDate)) {
        // Update release date and recalculate tasks
        const newTasks = calculateReleaseTasks(earliestDate);
        if (mode === 'cloud') {
          await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { 
            releaseDate: earliestDate,
            tasks: newTasks
          });
        } else {
          setData(p => ({
            ...p,
            releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, releaseDate: earliestDate, tasks: newTasks } : r)
          }));
        }
      }
    },

    // Phase 2: Enhanced video creation with auto-generated tasks
    addSongVideo: async (songId, video) => {
      // Find the song to get the release date for task generation
      const song = data.songs.find(s => s.id === songId);
      const releaseDate = video.releaseDate || song?.releaseDate || '';
      
      // Determine the primary video type for task generation
      const videoTypes = video.types || { lyric: false, enhancedLyric: false, music: false, visualizer: false, custom: false, customLabel: '' };
      let primaryVideoType = null;
      if (videoTypes.music) primaryVideoType = 'music';
      else if (videoTypes.lyric) primaryVideoType = 'lyric';
      else if (videoTypes.enhancedLyric) primaryVideoType = 'enhancedLyric';
      else if (videoTypes.visualizer) primaryVideoType = 'visualizer';
      else if (videoTypes.custom) primaryVideoType = 'custom';
      
      // Auto-generate video tasks based on video type
      const autoTasks = primaryVideoType ? generateVideoTasks(releaseDate, primaryVideoType) : [];
      
      const newVideo = {
        id: crypto.randomUUID(),
        title: video.title || 'New Video',
        versionId: video.versionId || 'core',
        releaseDate: releaseDate,
        subtasks: video.subtasks || [],
        types: videoTypes,
        // Availability windows
        exclusiveType: video.exclusiveType || 'None',
        exclusiveStartDate: video.exclusiveStartDate || '',
        exclusiveEndDate: video.exclusiveEndDate || '',
        exclusiveNotes: video.exclusiveNotes || '',
        // Cost layers
        estimatedCost: video.estimatedCost || 0,
        quotedCost: video.quotedCost || 0,
        paidCost: video.paidCost || 0,
        // Auto-generated tasks
        tasks: autoTasks,
        // Custom tasks on videos
        customTasks: video.customTasks || [],
        // Phase 8: Musicians assigned to video
        musicians: video.musicians || []
      };
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => song.id === songId ? {
          ...song,
          videos: [...(song.videos || []), newVideo]
        } : song)
      }));
      return newVideo;
    },

    updateSongVideo: async (songId, videoId, updates) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => song.id === songId ? {
          ...song,
          videos: (song.videos || []).map(v => v.id === videoId ? { ...v, ...updates } : v)
        } : song)
      }));
    },

    deleteSongVideo: async (songId, videoId) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => song.id === songId ? { ...song, videos: (song.videos || []).filter(v => v.id !== videoId) } : song)
      }));
    },

    // Update a task on a video
    updateVideoTask: async (songId, videoId, taskId, updates) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => {
          if (song.id !== songId) return song;
          const updatedVideos = (song.videos || []).map(v => {
            if (v.id !== videoId) return v;
            const updatedTasks = (v.tasks || []).map(t => t.id === taskId ? { ...t, ...updates, isOverridden: true } : t);
            return { ...v, tasks: updatedTasks };
          });
          return { ...song, videos: updatedVideos };
        })
      }));
    },

    // Add custom task to a video
    addVideoCustomTask: async (songId, videoId, task) => {
      const newTask = createUnifiedTask({
        type: 'Custom',
        title: task.title || 'New Task',
        description: task.description || '',
        date: task.date || '',
        dueDate: task.date || task.dueDate || '',
        status: task.status || 'Not Started',
        estimatedCost: task.estimatedCost || 0,
        quotedCost: task.quotedCost || 0,
        paidCost: task.paidCost || 0,
        notes: task.notes || '',
        parentType: 'video',
        parentId: videoId
      });
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => {
          if (song.id !== songId) return song;
          const updatedVideos = (song.videos || []).map(v => {
            if (v.id !== videoId) return v;
            return { ...v, customTasks: [...(v.customTasks || []), newTask] };
          });
          return { ...song, videos: updatedVideos };
        })
      }));
      return newTask;
    },

    // Delete custom task from a video
    deleteVideoCustomTask: async (songId, videoId, taskId) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => {
          if (song.id !== songId) return song;
          const updatedVideos = (song.videos || []).map(v => {
            if (v.id !== videoId) return v;
            return { ...v, customTasks: (v.customTasks || []).filter(t => t.id !== taskId) };
          });
          return { ...song, videos: updatedVideos };
        })
      }));
    },

    // Phase 8: Add musician to a video
    addVideoMusician: async (songId, videoId, musician) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => {
          if (song.id !== songId) return song;
          const updatedVideos = (song.videos || []).map(v => {
            if (v.id !== videoId) return v;
            return { ...v, musicians: [...(v.musicians || []), musician] };
          });
          return { ...song, videos: updatedVideos };
        })
      }));
    },

    // Phase 8: Remove musician from a video
    removeVideoMusician: async (songId, videoId, musicianId) => {
      setData(prev => ({
        ...prev,
        songs: (prev.songs || []).map(song => {
          if (song.id !== songId) return song;
          const updatedVideos = (song.videos || []).map(v => {
            if (v.id !== videoId) return v;
            return { ...v, musicians: (v.musicians || []).filter(m => m.id !== musicianId) };
          });
          return { ...song, videos: updatedVideos };
        })
      }));
    },

    // Phase 2: Add standalone video (not tied to a song)
    addStandaloneVideo: async (video) => {
      const releaseDate = video.releaseDate || '';
      const videoTypes = video.types || { lyric: false, enhancedLyric: false, music: false, visualizer: false, custom: false, customLabel: '' };
      let primaryVideoType = null;
      if (videoTypes.music) primaryVideoType = 'music';
      else if (videoTypes.lyric) primaryVideoType = 'lyric';
      else if (videoTypes.enhancedLyric) primaryVideoType = 'enhancedLyric';
      else if (videoTypes.visualizer) primaryVideoType = 'visualizer';
      else if (videoTypes.custom) primaryVideoType = 'custom';
      
      const autoTasks = primaryVideoType ? generateVideoTasks(releaseDate, primaryVideoType) : [];
      
      const newVideo = {
        id: crypto.randomUUID(),
        title: video.title || 'New Standalone Video',
        isStandalone: true,
        releaseDate: releaseDate,
        types: videoTypes,
        exclusiveType: video.exclusiveType || 'None',
        exclusiveStartDate: video.exclusiveStartDate || '',
        exclusiveEndDate: video.exclusiveEndDate || '',
        exclusiveNotes: video.exclusiveNotes || '',
        estimatedCost: video.estimatedCost || 0,
        quotedCost: video.quotedCost || 0,
        paidCost: video.paidCost || 0,
        tasks: autoTasks,
        customTasks: video.customTasks || [],
        notes: video.notes || ''
      };
      
      // Store standalone videos in a separate array
      setData(prev => ({
        ...prev,
        standaloneVideos: [...(prev.standaloneVideos || []), newVideo]
      }));
      return newVideo;
    },

    // Update standalone video
    updateStandaloneVideo: async (videoId, updates) => {
      setData(prev => ({
        ...prev,
        standaloneVideos: (prev.standaloneVideos || []).map(v => v.id === videoId ? { ...v, ...updates } : v)
      }));
    },

    // Delete standalone video
    deleteStandaloneVideo: async (videoId) => {
      setData(prev => ({
        ...prev,
        standaloneVideos: (prev.standaloneVideos || []).filter(v => v.id !== videoId)
      }));
    },
     
     // Recalculate release tasks from release date
     recalculateReleaseTasksAction: async (releaseId) => {
       const release = data.releases.find(r => r.id === releaseId);
       if (release && release.releaseDate) {
         let newTasks;
         if (!release.tasks || release.tasks.length === 0) {
           newTasks = calculateReleaseTasks(release.releaseDate);
         } else {
           newTasks = recalculateReleaseTasks(release.tasks, release.releaseDate);
         }
         if (mode === 'cloud') {
           await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), { tasks: newTasks });
         } else {
           setData(p => ({
             ...p,
             releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, tasks: newTasks } : r)
           }));
         }
       }
     }
  };

  return (
    <StoreContext.Provider value={{ data, actions, mode, stats }}>
      {children}
    </StoreContext.Provider>
  );
};