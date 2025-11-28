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
    const { data, actions } = useStore();
    const [date, setDate] = useState(new Date());
    const [newEvent, setNewEvent] = useState({ title: '', date: '', description: '' });
    const year = date.getFullYear();
    const month = date.getMonth();

    const items = useMemo(() => {
        const map = {};
        data.tasks.filter(t => t.dueDate && !t.archived).forEach(t => { map[t.dueDate] = map[t.dueDate] || []; map[t.dueDate].push({ ...t, _kind: 'task' }); });
        data.events.forEach(e => { if (e.date) { map[e.date] = map[e.date] || []; map[e.date].push({ ...e, _kind: 'event' }); } });
        (data.releases || []).forEach(r => {
          if (r.releaseDate) {
            map[r.releaseDate] = map[r.releaseDate] || [];
            map[r.releaseDate].push({
              id: `release-${r.id}`,
              title: `${r.name} Release`,
              date: r.releaseDate,
              _kind: 'release',
              releaseType: r.type
            });
          }
        });
        return map;
    }, [data.tasks, data.events, data.releases]);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    return (
        <div className="h-full flex flex-col p-6 pb-24">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className={THEME.punk.textStyle}>{monthNames[month]} {year}</h2>
        <div className="flex gap-2 bg-pink-100 border-4 border-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <button onClick={() => setDate(new Date(year, month - 1, 1))} className={cn("p-2 w-10", THEME.punk.btn, "bg-pink-500 text-white hover:bg-pink-400")}><Icon name="ChevronLeft" /></button>
          <button onClick={() => setDate(new Date(year, month + 1, 1))} className={cn("p-2 w-10", THEME.punk.btn, "bg-pink-500 text-white hover:bg-pink-400")}><Icon name="ChevronRight" /></button>
        </div>
      </div>

      <div className={cn("mb-4 p-4 flex flex-col gap-3 md:flex-row md:items-end", THEME.punk.card)}>
        <div className="flex-1 grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Title</label>
            <input value={newEvent.title} onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))} placeholder="Event title" className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Date</label>
            <input type="date" value={newEvent.date} onChange={e => setNewEvent(prev => ({ ...prev, date: e.target.value }))} className={cn("w-full", THEME.punk.input)} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase mb-1">Description</label>
            <input value={newEvent.description} onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))} placeholder="Notes or location" className={cn("w-full", THEME.punk.input)} />
          </div>
        </div>
        <button
          onClick={() => {
            if (!newEvent.title || !newEvent.date) return;
            actions.add('events', { ...newEvent, type: 'Standalone Event' });
            setNewEvent({ title: '', date: '', description: '' });
          }}
          className={cn("px-4 py-2 w-full md:w-auto", THEME.punk.btn, "bg-black text-white")}
        >
          + Add Standalone Event
        </button>
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
                                <div
                                  key={t.id}
                                  onClick={() => t._kind === 'task' && onEdit ? onEdit(t) : undefined}
                                  className={cn(
                                    "text-[10px] p-1 mb-1 font-bold uppercase truncate border border-black cursor-pointer",
                                    t._kind === 'release' ? 'bg-green-400 text-black' : t._kind === 'event' ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'
                                  )}
                                  title={t._kind === 'release' ? `${t.title}${t.releaseType ? ` (${t.releaseType})` : ''}` : t.description || t.title}
                                >
                                  {t.title}
                                </div>
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
    const [newMember, setNewMember] = useState({ name: '', role: '', type: 'individual', phone: '', email: '', notes: '', companyId: '' });
    const companies = (data.teamMembers || []).filter(m => m.type === 'company');

    const handleAdd = async () => {
      if (!newMember.name) return;
      await actions.addTeamMember(newMember);
      setNewMember({ name: '', role: '', type: 'individual', phone: '', email: '', notes: '', companyId: '' });
    };

    return (
        <div className="p-6 pb-24">
            <div className="flex justify-between mb-6"><h2 className={THEME.punk.textStyle}>Team</h2></div>
            <div className={cn("p-4 mb-6 grid md:grid-cols-2 gap-4", THEME.punk.card)}>
              <input value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="Name" className={cn("w-full", THEME.punk.input)} />
              <input value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })} placeholder="Role" className={cn("w-full", THEME.punk.input)} />
              <div className="flex gap-2 items-center">
                <label className="text-xs font-bold uppercase">Type</label>
                <select value={newMember.type} onChange={e => setNewMember({ ...newMember, type: e.target.value })} className={cn("w-full", THEME.punk.input)}>
                  <option value="individual">Individual</option>
                  <option value="company">Company</option>
                </select>
              </div>
              <select value={newMember.companyId} onChange={e => setNewMember({ ...newMember, companyId: e.target.value })} className={cn("w-full", THEME.punk.input)}>
                <option value="">Linked Company (optional)</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={newMember.phone} onChange={e => setNewMember({ ...newMember, phone: e.target.value })} placeholder="Phone" className={cn("w-full", THEME.punk.input)} />
              <input value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} placeholder="Email" className={cn("w-full", THEME.punk.input)} />
              <textarea value={newMember.notes} onChange={e => setNewMember({ ...newMember, notes: e.target.value })} placeholder="Notes" className={cn("w-full h-20", THEME.punk.input)} />
              <button onClick={handleAdd} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>
                + Add Team Member
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">{(data.teamMembers || []).map(v => (
              <div key={v.id} className={cn("p-4 relative space-y-1", THEME.punk.card)}>
                <h3 className="font-bold">{v.name}</h3>
                <p className="text-sm opacity-80">{v.role || v.type}</p>
                {v.companyId && <p className="text-xs font-bold">Linked: {companies.find(c => c.id === v.companyId)?.name || 'Company'}</p>}
                <p className="text-xs">{v.email}</p>
                <p className="text-xs">{v.phone}</p>
                {v.notes && <p className="text-xs opacity-70">{v.notes}</p>}
                <button onClick={()=>actions.deleteTeamMember(v.id)} className="absolute top-2 right-2 text-red-500"><Icon name="Trash2" size={16}/></button>
              </div>))}</div>
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
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Collect all tasks from various sources
    const allTasks = useMemo(() => {
        const tasks = [];
        
        // Legacy tasks from the original tasks array
        const legacyTasks = data.tasks.filter(t => !t.archived && !t.isCategory && t.status !== 'done');
        legacyTasks.forEach(t => {
            tasks.push({
                ...t,
                source: 'Legacy',
                sourceName: t.title,
                effectiveCost: t.actualCost || t.quotedCost || t.estimatedCost || 0,
                isPaid: t.actualCost > 0
            });
        });
        
        // Song tasks (deadlines) and custom tasks
        (data.songs || []).forEach(song => {
            (song.deadlines || []).filter(d => d.status !== 'Done').forEach(d => {
                tasks.push({
                    id: `song-${song.id}-${d.id}`,
                    title: d.type,
                    dueDate: d.date,
                    status: d.status,
                    source: 'Song',
                    sourceName: song.title,
                    estimatedCost: d.estimatedCost || 0,
                    quotedCost: d.quotedCost || 0,
                    paidCost: d.paidCost || 0,
                    effectiveCost: d.paidCost || d.quotedCost || d.estimatedCost || 0,
                    isPaid: (d.paidCost || 0) > 0
                });
            });
            (song.customTasks || []).filter(t => t.status !== 'Done').forEach(t => {
                tasks.push({
                    id: `song-custom-${song.id}-${t.id}`,
                    title: t.title,
                    dueDate: t.date,
                    status: t.status,
                    source: 'Song',
                    sourceName: song.title,
                    estimatedCost: t.estimatedCost || 0,
                    quotedCost: t.quotedCost || 0,
                    paidCost: t.paidCost || 0,
                    effectiveCost: t.paidCost || t.quotedCost || t.estimatedCost || 0,
                    isPaid: (t.paidCost || 0) > 0
                });
            });
        });
        
        // Global tasks
        (data.globalTasks || []).filter(t => t.status !== 'Done' && !t.isArchived).forEach(t => {
            tasks.push({
                id: `global-${t.id}`,
                title: t.taskName,
                dueDate: t.date,
                status: t.status,
                source: 'Global',
                sourceName: t.category,
                estimatedCost: t.estimatedCost || 0,
                quotedCost: t.quotedCost || 0,
                paidCost: t.paidCost || 0,
                effectiveCost: t.paidCost || t.quotedCost || t.estimatedCost || 0,
                isPaid: (t.paidCost || 0) > 0
            });
        });
        
        // Release tasks
        (data.releases || []).forEach(release => {
            (release.tasks || []).filter(t => t.status !== 'Done').forEach(t => {
                tasks.push({
                    id: `release-${release.id}-${t.id}`,
                    title: t.type,
                    dueDate: t.date,
                    status: t.status,
                    source: 'Release',
                    sourceName: release.name,
                    estimatedCost: t.estimatedCost || 0,
                    quotedCost: t.quotedCost || 0,
                    paidCost: t.paidCost || 0,
                    effectiveCost: t.paidCost || t.quotedCost || t.estimatedCost || 0,
                    isPaid: (t.paidCost || 0) > 0
                });
            });
        });
        
        return tasks;
    }, [data.tasks, data.songs, data.globalTasks, data.releases]);
    
    // Filter tasks into categories
    const inProgress = allTasks.filter(t => t.status === 'In Progress');
    const overdue = allTasks.filter(t => t.dueDate && t.dueDate < today);
    const dueSoon = allTasks.filter(t => t.dueDate && t.dueDate >= today && t.dueDate <= nextWeek);
    const unpaid = allTasks.filter(t => !t.isPaid && t.effectiveCost > 0);
    
    const TaskCard = ({ task, highlight }) => (
        <div 
            key={task.id} 
            onClick={() => task.source === 'Legacy' ? onEdit(task) : undefined} 
            className={cn(
                "p-4 cursor-pointer hover:bg-yellow-50 border-l-4",
                THEME.punk.card,
                highlight === 'overdue' ? 'border-l-red-500 bg-red-50' :
                highlight === 'dueSoon' ? 'border-l-yellow-500 bg-yellow-50' :
                highlight === 'inProgress' ? 'border-l-blue-500 bg-blue-50' :
                highlight === 'unpaid' ? 'border-l-purple-500 bg-purple-50' :
                'border-l-gray-300'
            )}
        >
            <div className="font-bold text-lg">{task.title}</div>
            <div className="text-xs font-bold text-gray-600">{task.source}: {task.sourceName}</div>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
                {task.dueDate && <span className={cn("px-2 py-1 font-bold border border-black", task.dueDate < today ? 'bg-red-200' : task.dueDate <= nextWeek ? 'bg-yellow-200' : 'bg-gray-200')}>
                    {task.dueDate < today ? 'OVERDUE: ' : 'Due: '}{task.dueDate}
                </span>}
                <span className={cn("px-2 py-1 font-bold border border-black", task.status === 'In Progress' ? 'bg-blue-200' : 'bg-gray-200')}>{task.status}</span>
                {task.effectiveCost > 0 && <span className={cn("px-2 py-1 font-bold border border-black", task.isPaid ? 'bg-green-200' : 'bg-purple-200')}>{task.isPaid ? 'Paid' : 'Unpaid'}: {formatMoney(task.effectiveCost)}</span>}
            </div>
        </div>
    );
    
    return (
        <div className="p-6 pb-24">
            <h2 className={cn("mb-6", THEME.punk.textStyle)}>Active Tasks</h2>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className={cn("p-4 text-center", THEME.punk.card, "bg-red-50")}>
                    <div className="text-3xl font-black text-red-600">{overdue.length}</div>
                    <div className="text-xs font-bold uppercase">Overdue</div>
                </div>
                <div className={cn("p-4 text-center", THEME.punk.card, "bg-yellow-50")}>
                    <div className="text-3xl font-black text-yellow-600">{dueSoon.length}</div>
                    <div className="text-xs font-bold uppercase">Due This Week</div>
                </div>
                <div className={cn("p-4 text-center", THEME.punk.card, "bg-blue-50")}>
                    <div className="text-3xl font-black text-blue-600">{inProgress.length}</div>
                    <div className="text-xs font-bold uppercase">In Progress</div>
                </div>
                <div className={cn("p-4 text-center", THEME.punk.card, "bg-purple-50")}>
                    <div className="text-3xl font-black text-purple-600">{unpaid.length}</div>
                    <div className="text-xs font-bold uppercase">Unpaid</div>
                </div>
            </div>
            
            {/* Overdue Tasks */}
            {overdue.length > 0 && (
                <div className="mb-6">
                    <h3 className="font-black uppercase text-red-600 mb-3 border-b-4 border-red-600 pb-2">⚠️ Overdue Tasks</h3>
                    <div className="grid gap-3">{overdue.map(t => <TaskCard key={t.id} task={t} highlight="overdue" />)}</div>
                </div>
            )}
            
            {/* Due This Week */}
            {dueSoon.length > 0 && (
                <div className="mb-6">
                    <h3 className="font-black uppercase text-yellow-600 mb-3 border-b-4 border-yellow-600 pb-2">📅 Due This Week</h3>
                    <div className="grid gap-3">{dueSoon.map(t => <TaskCard key={t.id} task={t} highlight="dueSoon" />)}</div>
                </div>
            )}
            
            {/* In Progress */}
            {inProgress.length > 0 && (
                <div className="mb-6">
                    <h3 className="font-black uppercase text-blue-600 mb-3 border-b-4 border-blue-600 pb-2">🔄 In Progress</h3>
                    <div className="grid gap-3">{inProgress.map(t => <TaskCard key={t.id} task={t} highlight="inProgress" />)}</div>
                </div>
            )}
            
            {/* Unpaid Tasks */}
            {unpaid.length > 0 && (
                <div className="mb-6">
                    <h3 className="font-black uppercase text-purple-600 mb-3 border-b-4 border-purple-600 pb-2">💰 Unpaid Tasks</h3>
                    <div className="grid gap-3">{unpaid.map(t => <TaskCard key={t.id} task={t} highlight="unpaid" />)}</div>
                </div>
            )}
            
            {allTasks.length === 0 && (
                <div className="text-center py-10 opacity-50">No active tasks found.</div>
            )}
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

                {/* Stages */}
                <div className="pt-4 border-t-4 border-black">
                  <h3 className="font-black text-xs uppercase mb-2">Workflow Stages</h3>
                  <div className="space-y-2">
                    {(data.stages || []).map(stage => (
                      <div key={stage.id} className="flex items-center gap-2">
                        <input value={stage.name} onChange={e => actions.updateStage(stage.id, { name: e.target.value })} className={cn("flex-1", THEME.punk.input)} />
                        <button onClick={() => actions.deleteStage(stage.id)} className="text-red-500 font-bold text-xs">Delete</button>
                      </div>
                    ))}
                    <button onClick={() => actions.addStage({ name: `Stage ${ (data.stages?.length || 0) + 1}` })} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>+ Add Stage</button>
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
