import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc } from 'firebase/firestore';

const StoreContext = createContext();

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }) => {
  const [mode, setMode] = useState('loading');
  const [data, setData] = useState({ tasks: [], photos: [], vendors: [], misc: [], events: [], stages: [], settings: {} });
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
      const unsubs = ['album_tasks', 'album_photos', 'album_vendors', 'album_misc_expenses', 'album_events', 'album_stages'].map(col => {
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
    return { min: min + miscTotal, max: max + miscTotal, act: act + miscTotal };
  }, [data.tasks, data.misc]);

  const actions = {
     add: async (col, item) => {
         if (mode === 'cloud') await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, `album_${col}`), { ...item, createdAt: serverTimestamp() });
         else setData(p => ({...p, [col === 'misc_expenses' ? 'misc' : col]: [...(p[col === 'misc_expenses' ? 'misc' : col] || []), {id:crypto.randomUUID(), ...item}]}));
     },
     update: async (col, id, item) => {
         if (mode === 'cloud') await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, `album_${col}`, id), item);
         else setData(p => {
             const key = col === 'misc_expenses' ? 'misc' : col;
             return {...p, [key]: p[key].map(i => i.id === id ? { ...i, ...item } : i)};
         });
     },
     delete: async (col, id) => {
         if (mode === 'cloud') await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, `album_${col}`, id));
         else setData(p => {
             const key = col === 'misc_expenses' ? 'misc' : col;
             return {...p, [key]: p[key].filter(i => i.id !== id)};
         });
     },
     saveSettings: async (newSettings) => {
         if (mode === 'cloud') await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'album_tasks', 'settings'), newSettings, { merge: true });
         else setData(p => ({...p, settings: {...p.settings, ...newSettings}}));
     },
     connectCloud: (config) => { localStorage.setItem('at_firebase_config', JSON.stringify(config)); window.location.reload(); },
     disconnect: () => { localStorage.removeItem('at_firebase_config'); window.location.reload(); }
  };

  return (
    <StoreContext.Provider value={{ data, actions, mode, stats }}>
      {children}
    </StoreContext.Provider>
  );
};