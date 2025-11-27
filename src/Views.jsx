import { useState, useMemo } from 'react';
import { useStore } from './Store';
import { THEME, COLORS, formatMoney, cn } from './utils';
import { Icon } from './Components';

export const ListView = ({ onEdit }) => {
    const { data, actions } = useStore();
    const [filter, setFilter] = useState('all');

    const buildTree = (pid) => data.tasks.filter(t => t.parentId === pid && !t.archived).map(t => ({...t, children: buildTree(t.id)}));
    const tree = buildTree(null);

    const handleAdd = (type, pid) => {
        const stageId = filter !== 'all' ? filter : (data.stages[0]?.id || '');
        actions.add('tasks', { title: `New ${type}`, isCategory: type === 'category', parentId: pid, status: 'todo', stageId });
    };

    const TaskRow = ({ task, level = 0 }) => {
        const [open, setOpen] = useState(true);
        const cost = task.actualCost || task.quotedCost || task.estimatedCost || 0;
        
        return (
            <div className="select-none">
                <div className={cn("flex items-center gap-2 p-2 border-b border-gray-200 hover:bg-gray-50 cursor-pointer", task.isCategory ? "bg-gray-100" : "")}
                     style={{ paddingLeft: `${level * 20 + 8}px` }}
                     onClick={() => onEdit(task)}>
                    <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className={cn("p-1 hover:bg-gray-300 rounded", task.children.length ? "visible" : "invisible")}><Icon name={open ? "ChevronDown" : "ChevronRight"} size={14} /></button>
                    <div className={cn("p-1 rounded", task.isCategory ? "bg-black text-white" : "bg-gray-200")}><Icon name={task.isCategory ? "Folder" : "Circle"} size={14} /></div>
                    <span className="flex-1 font-bold truncate">{task.title}</span>
                    {task.dueDate && <span className="text-[10px] bg-yellow-300 px-1 border border-black font-bold">{task.dueDate}</span>}
                    {cost > 0 && <span className="text-[10px] font-bold px-1 border border-black bg-white">{formatMoney(cost)}</span>}
                    <button onClick={(e) => { e.stopPropagation(); handleAdd('task', task.id); }} className="p-1 hover:bg-gray-300 rounded"><Icon name="Plus" size={14} /></button>
                </div>
                {open && task.children.map(c => <TaskRow key={c.id} task={c} level={level + 1} />)}
            </div>
        );
    };

    return (
        <div className="p-6 pb-24">
            <div className="flex justify-between mb-6">
                <div className={cn("flex items-center px-2 bg-white", THEME.punk.border)}>
                   <span className="text-xs font-bold uppercase px-2">Filter:</span>
                   <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-transparent font-bold outline-none py-2 w-32">
                       <option value="all">All Stages</option>
                       {data.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>
                <button onClick={() => handleAdd('category', null)} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Category</button>
            </div>
            <div className={cn("min-h-[500px]", THEME.punk.card)}>
                {tree.length === 0 ? <div className="p-10 text-center opacity-50">No tasks. Add a category to start.</div> : tree.map(n => <TaskRow key={n.id} task={n} />)}
            </div>
        </div>
    );
};

export const CalendarView = ({ onEdit }) => {
    const { data } = useStore();
    const [date, setDate] = useState(new Date());
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const items = useMemo(() => {
        const map = {};
        data.tasks.filter(t => t.dueDate && !t.archived).forEach(t => { map[t.dueDate] = map[t.dueDate] || []; map[t.dueDate].push(t); });
        data.events.forEach(e => { if (e.date) { map[e.date] = map[e.date] || []; map[e.date].push(e); } });
        return map;
    }, [data.tasks, data.events]);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    return (
        <div className="h-full flex flex-col p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className={THEME.punk.textStyle}>{monthNames[month]} {year}</h2>
        <div className="flex gap-2 bg-pink-100 border-4 border-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <button onClick={() => setDate(new Date(year, month - 1, 1))} className={cn("p-2", THEME.punk.btn)}><Icon name="ChevronLeft" /></button>
          <button onClick={() => setDate(new Date(year, month + 1, 1))} className={cn("p-2", THEME.punk.btn)}><Icon name="ChevronRight" /></button>
        </div>
      </div>
            <div className="grid grid-cols-7 gap-px bg-black border-4 border-black text-center font-black text-white mb-px">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="py-3">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px bg-black border-4 border-black flex-1 overflow-y-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="bg-gray-100 h-24"></div>)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const list = items[dateStr] || [];
                    return (
                        <div key={d} className="bg-white h-24 p-1 overflow-y-auto border-r border-b border-black hover:bg-yellow-50">
                            <div className="text-xs font-bold mb-1">{d}</div>
                            {list.map(t => (
                                <div key={t.id} onClick={() => onEdit(t)} className="text-[10px] p-1 mb-1 font-bold uppercase truncate border border-black cursor-pointer bg-pink-500 text-white">{t.title}</div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const GalleryView = () => {
    const { data, actions } = useStore();

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            actions.add('photos', { data: ev.target.result, name: file.name });
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="p-6 pb-24">
             <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
                <h2 className={cn("text-3xl flex items-center gap-2", THEME.punk.textStyle)}><Icon name="Image" /> Gallery</h2>
                <label className={cn("px-4 py-2 cursor-pointer bg-white flex items-center gap-2", THEME.punk.btn)}>
                    <Icon name="Upload" size={16}/> Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.photos.map(p => (
                    <div key={p.id} className={cn("relative aspect-square group overflow-hidden", THEME.punk.card)}>
                        <img src={p.data} className="w-full h-full object-cover" />
                        <button onClick={() => actions.delete('photos', p.id)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="Trash2" size={14} /></button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black text-white text-[10px] p-1 truncate">{p.taskId ? 'Task Photo' : 'General'}</div>
                    </div>
                ))}
                {data.photos.length === 0 && <div className="col-span-full py-20 text-center opacity-50">No photos yet.</div>}
            </div>
        </div>
    );
};

export const TeamView = () => {
    const { data, actions } = useStore();
    const add = () => { const n = prompt('Name:'); if(n) actions.add('vendors', {name:n, role:'Staff', type:'individual'}); };
    return (
        <div className="p-6">
            <div className="flex justify-between mb-6"><h2 className={THEME.punk.textStyle}>Team</h2><button onClick={add} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add</button></div>
            <div className="grid md:grid-cols-2 gap-4">{data.vendors.map(v => (<div key={v.id} className={cn("p-4 relative", THEME.punk.card)}><h3 className="font-bold">{v.name}</h3><p className="text-sm opacity-50">{v.role}</p><button onClick={()=>actions.delete('vendors', v.id)} className="absolute top-2 right-2 text-red-500"><Icon name="Trash2" size={16}/></button></div>))}</div>
        </div>
    );
};

export const MiscView = () => {
    const { data, actions } = useStore();
    const add = () => { const d = prompt('Desc:'); const a = prompt('Amount:'); if(d && a) actions.add('misc', {description:d, amount:parseFloat(a)}); };
    return (
        <div className="p-6">
            <div className="flex justify-between mb-6"><h2 className={THEME.punk.textStyle}>Expenses</h2><button onClick={add} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add</button></div>
            <div className={THEME.punk.card}>{data.misc.map(m => (<div key={m.id} className="flex justify-between p-3 border-b border-gray-100"><span>{m.description}</span><span className="font-bold">{formatMoney(m.amount)}</span></div>))}</div>
        </div>
    );
};

export const ArchiveView = () => {
    const { data, actions } = useStore();
    return (
        <div className="p-6">
            <h2 className={cn("mb-6", THEME.punk.textStyle)}>Trash</h2>
            <div className="space-y-2">{data.tasks.filter(t => t.archived).map(t => (<div key={t.id} className={cn("p-3 flex justify-between items-center", THEME.punk.card)}><span>{t.title}</span><button onClick={()=>actions.update('tasks', t.id, {archived:false})} className="text-green-600 font-bold text-xs uppercase">Restore</button></div>))}</div>
        </div>
    );
};

export const ActiveView = ({ onEdit }) => {
    const { data } = useStore();
    const active = data.tasks.filter(t => !t.archived && !t.isCategory && t.status !== 'done');
    return (
        <div className="p-6">
            <h2 className={cn("mb-6", THEME.punk.textStyle)}>Active Tasks</h2>
            <div className="grid gap-4">{active.map(t => (<div key={t.id} onClick={() => onEdit(t)} className={cn("p-4 cursor-pointer hover:bg-yellow-50", THEME.punk.card)}><div className="font-bold text-lg">{t.title}</div><div className="text-xs opacity-60">{t.dueDate ? `Due: ${t.dueDate}` : 'In Progress'}</div></div>))}</div>
        </div>
    );
};

export const SettingsView = () => {
    const { data, actions, mode } = useStore();
    const settings = data.settings || {};
    const themeMode = settings.themeMode || 'light';
    const accent = settings.themeColor || 'pink';
    const isConnected = mode === 'cloud';
    const isLoading = mode === 'loading';

    return (
        <div className="p-6 max-w-xl">
            <h2 className={cn("mb-6", THEME.punk.textStyle)}>Settings</h2>
            <div className={cn("p-6 space-y-6", THEME.punk.card)}>
                {/* Project Info */}
                <div>
                    <label className="font-bold block mb-1">Album</label>
                    <input
                        value={settings.albumTitle || ''}
                        onChange={e => actions.saveSettings({ albumTitle: e.target.value })}
                        className={cn("w-full", THEME.punk.input)}
                    />
                </div>
                <div>
                    <label className="font-bold block mb-1">Artist</label>
                    <input
                        value={settings.artistName || ''}
                        onChange={e => actions.saveSettings({ artistName: e.target.value })}
                        className={cn("w-full", THEME.punk.input)}
                    />
                </div>

                {/* Theme Mode */}
                <div className="pt-4 border-t-4 border-black">
                    <h3 className="font-black text-xs uppercase mb-2">Theme Mode</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => actions.saveSettings({ themeMode: 'light' })}
                            className={cn(
                                "py-3 text-xs font-black uppercase",
                                THEME.punk.btn,
                                themeMode === 'light' ? "bg-black text-white" : "bg-white"
                            )}
                        >
                            Light
                        </button>
                        <button
                            onClick={() => actions.saveSettings({ themeMode: 'dark' })}
                            className={cn(
                                "py-3 text-xs font-black uppercase",
                                THEME.punk.btn,
                                themeMode === 'dark' ? "bg-black text-white" : "bg-white"
                            )}
                        >
                            Dark
                        </button>
                    </div>
                </div>

                {/* Accent Color */}
                <div className="pt-4 border-t-4 border-black">
                    <h3 className="font-black text-xs uppercase mb-2">Accent Color</h3>
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(COLORS).map(([key, cls]) => {
                            const parts = cls.split(' ');
                            const bgClass = parts[0];
                            const textClass = parts[2];
                            const isActive = key === accent;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => actions.saveSettings({ themeColor: key })}
                                    className={cn(
                                        "flex flex-col items-center gap-1 text-[10px] font-black uppercase",
                                        isActive ? "opacity-100" : "opacity-60 hover:opacity-100"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "w-8 h-8 rounded-full border-4 border-black",
                                            bgClass
                                        )}
                                    />
                                    <span className={textClass}>{key}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Cloud connection */}
                <div className="pt-4 border-t-4 border-black">
                    <h3 className="font-black text-xs uppercase mb-2">Cloud Sync</h3>
                    
                    {/* Connection Status */}
                    <div className={cn("p-3 mb-3 text-xs font-bold border-4 border-black", isConnected ? "bg-green-100" : isLoading ? "bg-yellow-100" : "bg-gray-100")}>
                        Status: {isLoading ? "Loading..." : isConnected ? "✓ Connected (Cloud Mode)" : "○ Local Storage Only"}
                    </div>
                    
                    <p className="text-xs mb-3 opacity-70">
                        {isConnected 
                            ? "Your data is syncing across all devices via Firebase. Disconnect to switch back to local storage." 
                            : "Currently using local storage. Connect to Firebase to sync data across PC and mobile devices."}
                    </p>
                    
                    {!isConnected && (
                        <div className="text-xs mb-3 p-3 bg-blue-50 border-2 border-blue-300">
                            <p className="font-bold mb-1">📱 Want to sync across devices?</p>
                            <p className="opacity-80">Follow the setup guide to connect Firebase and access your data from both PC and Android phone!</p>
                            <p className="mt-2 opacity-70">See FIREBASE_SETUP.md in the project repository for detailed instructions.</p>
                        </div>
                    )}
                    
                    <button
                        onClick={() => {
                            const c = prompt("Paste Firebase config JSON:\n\nExample:\n{\n  \"apiKey\": \"YOUR_API_KEY\",\n  \"authDomain\": \"...\",\n  \"projectId\": \"...\",\n  \"storageBucket\": \"...\",\n  \"messagingSenderId\": \"...\",\n  \"appId\": \"...\"\n}");
                            if (c) {
                                try {
                                    const config = JSON.parse(c);
                                    // Validate required fields
                                    if (!config.apiKey || !config.authDomain || !config.projectId) {
                                        alert("Missing required fields. Please ensure your Firebase config includes apiKey, authDomain, and projectId.");
                                        return;
                                    }
                                    actions.connectCloud(config);
                                } catch (e) {
                                    alert(`Invalid JSON format: ${e.message}\n\nPlease check your Firebase config and try again. Make sure to copy the entire configuration object.`);
                                }
                            }
                        }}
                        className={cn("w-full py-3 mb-2", THEME.punk.btn, "bg-blue-500 text-white")}
                        disabled={isConnected}
                    >
                        {isConnected ? "Already Connected" : "Connect to Firebase"}
                    </button>
                    
                    {isConnected && (
                        <button
                            onClick={() => {
                                if (confirm("Disconnect from Firebase? Your local data will be preserved, but you'll lose cloud sync until you reconnect.")) {
                                    actions.disconnect();
                                }
                            }}
                            className={cn("w-full py-3", THEME.punk.btn, "bg-red-500 text-white")}
                        >
                            Disconnect from Firebase
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
