import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc } from 'firebase/firestore';

const StoreContext = createContext();

export const useStore = () => useContext(StoreContext);

// Status enum for consistency across all entities
export const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Done', 'Delayed'];

// Song categories
export const SONG_CATEGORIES = ['Album', 'Bonus', 'Christmas EP', 'EP', 'Other'];

// Video types
export const VIDEO_TYPES = ['None', 'Lyric', 'Enhanced', 'Enhanced + Loop', 'Full'];

// Deadline types
export const DEADLINE_TYPES = ['Mix', 'Master', 'Artwork', 'Upload', 'VideoDelivery', 'Release'];

// Release types
export const RELEASE_TYPES = ['Album', 'EP', 'Remix EP', 'Deluxe', 'Other'];

// Version types for recording requirements
export const VERSION_TYPES = ['Album', 'Radio Edit', 'Acoustic', 'Extended', 'Loop Version', 'Remix', 'Instrumental', 'Clean'];

// Global task categories
export const GLOBAL_TASK_CATEGORIES = ['Branding', 'Web', 'Legal', 'Visuals', 'Marketing', 'Events', 'Audio', 'Video', 'Merch', 'Other'];

// Helper function to calculate deadline dates based on release date
export const calculateDeadlines = (releaseDate, isSingle, videoType) => {
  if (!releaseDate) return [];
  
  const release = new Date(releaseDate);
  const deadlines = [];
  
  // Mix deadline: releaseDate minus 42 days
  const mixDate = new Date(release);
  mixDate.setDate(mixDate.getDate() - 42);
  deadlines.push({
    id: crypto.randomUUID(),
    type: 'Mix',
    date: mixDate.toISOString().split('T')[0],
    status: 'Not Started',
    estimatedCost: 0,
    notes: '',
    isOverridden: false
  });
  
  // Master deadline: releaseDate minus 21 days
  const masterDate = new Date(release);
  masterDate.setDate(masterDate.getDate() - 21);
  deadlines.push({
    id: crypto.randomUUID(),
    type: 'Master',
    date: masterDate.toISOString().split('T')[0],
    status: 'Not Started',
    estimatedCost: 0,
    notes: '',
    isOverridden: false
  });
  
  // Artwork deadline: releaseDate minus 28 days (only if isSingle is true)
  if (isSingle) {
    const artworkDate = new Date(release);
    artworkDate.setDate(artworkDate.getDate() - 28);
    deadlines.push({
      id: crypto.randomUUID(),
      type: 'Artwork',
      date: artworkDate.toISOString().split('T')[0],
      status: 'Not Started',
      estimatedCost: 0,
      notes: '',
      isOverridden: false
    });
  }
  
  // Upload deadline (DSP upload): releaseDate minus 14 days (only if isSingle is true)
  if (isSingle) {
    const uploadDate = new Date(release);
    uploadDate.setDate(uploadDate.getDate() - 14);
    deadlines.push({
      id: crypto.randomUUID(),
      type: 'Upload',
      date: uploadDate.toISOString().split('T')[0],
      status: 'Not Started',
      estimatedCost: 0,
      notes: '',
      isOverridden: false
    });
  }
  
  // Video delivery deadline based on videoType
  if (videoType && videoType !== 'None') {
    const videoDate = new Date(release);
    if (videoType === 'Full') {
      videoDate.setDate(videoDate.getDate() - 30);
    } else {
      // Lyric, Enhanced, Enhanced + Loop
      videoDate.setDate(videoDate.getDate() - 14);
    }
    deadlines.push({
      id: crypto.randomUUID(),
      type: 'VideoDelivery',
      date: videoDate.toISOString().split('T')[0],
      status: 'Not Started',
      estimatedCost: 0,
      notes: '',
      isOverridden: false
    });
  }
  
  // Release deadline: exactly releaseDate
  deadlines.push({
    id: crypto.randomUUID(),
    type: 'Release',
    date: releaseDate,
    status: 'Not Started',
    estimatedCost: 0,
    notes: '',
    isOverridden: false
  });
  
  return deadlines;
};

// Recalculate deadlines from release date (only non-overridden ones)
export const recalculateDeadlines = (existingDeadlines, releaseDate, isSingle, videoType) => {
  if (!releaseDate) return existingDeadlines;
  
  const release = new Date(releaseDate);
  const newDeadlines = [...existingDeadlines];
  
  const offsets = {
    'Mix': -42,
    'Master': -21,
    'Artwork': -28,
    'Upload': -14,
    'VideoDelivery': videoType === 'Full' ? -30 : -14,
    'Release': 0
  };
  
  newDeadlines.forEach(deadline => {
    if (!deadline.isOverridden && offsets[deadline.type] !== undefined) {
      const newDate = new Date(release);
      newDate.setDate(newDate.getDate() + offsets[deadline.type]);
      deadline.date = newDate.toISOString().split('T')[0];
    }
  });
  
  return newDeadlines;
};

export const StoreProvider = ({ children }) => {
  const [mode, setMode] = useState('loading');
  const [data, setData] = useState({ 
    tasks: [], 
    photos: [], 
    vendors: [], 
    misc: [], 
    events: [], 
    stages: [], 
    settings: {},
    // New entities from spec
    songs: [],
    globalTasks: [],
    releases: []
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
        'album_tasks', 'album_photos', 'album_vendors', 'album_misc_expenses', 
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
             setData(prev => ({ ...prev, [key === 'task' ? 'tasks' : key]: list }));
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
      songsTotal += song.estimatedCost || 0;
      (song.deadlines || []).forEach(d => { songsTotal += d.estimatedCost || 0; });
      (song.customTasks || []).forEach(t => { songsTotal += t.estimatedCost || 0; });
    });
    
    (data.globalTasks || []).forEach(t => { globalTasksTotal += t.estimatedCost || 0; });
    (data.releases || []).forEach(r => { releasesTotal += r.estimatedCost || 0; });
    
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
     
     // Song-specific actions
     addSong: async (song) => {
       const deadlines = calculateDeadlines(song.releaseDate, song.isSingle, song.videoType);
       const newSong = {
         id: crypto.randomUUID(),
         title: song.title || 'New Song',
         category: song.category || 'Album',
         releaseDate: song.releaseDate || '',
         isSingle: song.isSingle || false,
         videoType: song.videoType || 'None',
         stemsNeeded: song.stemsNeeded || false,
         estimatedCost: song.estimatedCost || 0,
         extraVersionsNeeded: song.extraVersionsNeeded || '',
         deadlines: deadlines,
         customTasks: []
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
       const newTask = {
         id: crypto.randomUUID(),
         songId,
         title: task.title || 'New Task',
         description: task.description || '',
         date: task.date || '',
         status: task.status || 'Not Started',
         estimatedCost: task.estimatedCost || 0,
         notes: task.notes || ''
       };
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
       const newTask = {
         id: crypto.randomUUID(),
         taskName: task.taskName || 'New Task',
         category: task.category || 'Other',
         date: task.date || '',
         description: task.description || '',
         assignedTo: task.assignedTo || '',
         status: task.status || 'Not Started',
         estimatedCost: task.estimatedCost || 0,
         notes: task.notes || ''
       };
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
     
     // Release actions
     addRelease: async (release) => {
       const newRelease = {
         id: crypto.randomUUID(),
         name: release.name || 'New Release',
         type: release.type || 'Album',
         releaseDate: release.releaseDate || '',
         estimatedCost: release.estimatedCost || 0,
         notes: release.notes || '',
         requiredRecordings: []
       };
       if (mode === 'cloud') {
         await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'album_releases'), { ...newRelease, createdAt: serverTimestamp() });
       } else {
         setData(p => ({...p, releases: [...(p.releases || []), newRelease]}));
       }
       return newRelease;
     },
     
     updateRelease: async (releaseId, updates) => {
       if (mode === 'cloud') {
         await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_releases', releaseId), updates);
       } else {
         setData(p => ({
           ...p,
           releases: (p.releases || []).map(r => r.id === releaseId ? { ...r, ...updates } : r)
         }));
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
     }
  };

  return (
    <StoreContext.Provider value={{ data, actions, mode, stats }}>
      {children}
    </StoreContext.Provider>
  );
};