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
    const [selectedItem, setSelectedItem] = useState(null);
    const year = date.getFullYear();
    const month = date.getMonth();

    const items = useMemo(() => {
        const map = {};
        
        // Legacy tasks
        data.tasks.filter(t => t.dueDate && !t.archived).forEach(t => { 
            map[t.dueDate] = map[t.dueDate] || []; 
            map[t.dueDate].push({ ...t, _kind: 'task' }); 
        });
        
        // Events
        data.events.forEach(e => { 
            if (e.date) { 
                map[e.date] = map[e.date] || []; 
                map[e.date].push({ ...e, _kind: 'event' }); 
            } 
        });
        
        // Releases
        (data.releases || []).forEach(r => {
            if (r.releaseDate) {
                map[r.releaseDate] = map[r.releaseDate] || [];
                map[r.releaseDate].push({
                    id: `release-${r.id}`,
                    _releaseId: r.id,
                    title: `${r.name} Release`,
                    date: r.releaseDate,
                    _kind: 'release',
                    releaseType: r.type
                });
            }
        });
        
        // Songs (release dates)
        (data.songs || []).forEach(song => {
            if (song.releaseDate) {
                map[song.releaseDate] = map[song.releaseDate] || [];
                map[song.releaseDate].push({
                    id: `song-${song.id}`,
                    _songId: song.id,
                    title: `🎵 ${song.title}`,
                    date: song.releaseDate,
                    _kind: 'song'
                });
            }
            
            // Song tasks
            (song.deadlines || []).forEach(task => {
                if (task.date) {
                    map[task.date] = map[task.date] || [];
                    map[task.date].push({
                        id: `song-task-${song.id}-${task.id}`,
                        _songId: song.id,
                        title: `${task.type} - ${song.title}`,
                        date: task.date,
                        status: task.status,
                        _kind: 'song-task'
                    });
                }
            });
            
            // Song versions (non-core versions with their own release dates)
            (song.versions || []).filter(v => v.id !== 'core' && v.releaseDate).forEach(v => {
                map[v.releaseDate] = map[v.releaseDate] || [];
                map[v.releaseDate].push({
                    id: `version-${song.id}-${v.id}`,
                    _songId: song.id,
                    _versionId: v.id,
                    title: `🎵 ${v.name}`,
                    date: v.releaseDate,
                    _kind: 'version'
                });
            });
            
            // Videos
            (song.videos || []).forEach(video => {
                if (video.releaseDate) {
                    map[video.releaseDate] = map[video.releaseDate] || [];
                    map[video.releaseDate].push({
                        id: `video-${song.id}-${video.id}`,
                        _songId: song.id,
                        _videoId: video.id,
                        title: `📹 ${video.title}`,
                        date: video.releaseDate,
                        _kind: 'video'
                    });
                }
            });
        });
        
        // Global tasks
        (data.globalTasks || []).filter(t => t.date && !t.isArchived).forEach(t => {
            map[t.date] = map[t.date] || [];
            map[t.date].push({
                id: `global-${t.id}`,
                _globalTaskId: t.id,
                title: `📋 ${t.taskName}`,
                date: t.date,
                status: t.status,
                _kind: 'global-task'
            });
        });
        
        return map;
    }, [data.tasks, data.events, data.releases, data.songs, data.globalTasks]);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    
    // Navigate to today
    const goToToday = () => setDate(new Date());

    const getItemColor = (kind) => {
        switch (kind) {
            case 'release': return 'bg-green-400 text-black';
            case 'event': return 'bg-blue-500 text-white';
            case 'task': return 'bg-pink-500 text-white';
            case 'song': return 'bg-purple-500 text-white';
            case 'song-task': return 'bg-pink-300 text-black';
            case 'version': return 'bg-indigo-400 text-white';
            case 'video': return 'bg-orange-500 text-white';
            case 'global-task': return 'bg-yellow-400 text-black';
            default: return 'bg-gray-400 text-white';
        }
    };

    const handleItemClick = (item) => {
        if (item._kind === 'task' && onEdit) {
            onEdit(item);
        } else {
            setSelectedItem(item);
        }
    };

    return (
        <div className="h-full flex flex-col p-6 pb-24">
            {/* Header with navigation */}
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className={THEME.punk.textStyle}>{monthNames[month]} {year}</h2>
                <div className={cn("flex gap-2 border-4 p-1", "bg-pink-100 dark:bg-slate-700 border-black dark:border-slate-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(100,116,139,1)]")}>
                    <button onClick={() => setDate(new Date(year - 1, month, 1))} className={cn("p-2 w-10 text-xs font-bold border-4 border-black dark:border-slate-600", "bg-pink-300 dark:bg-slate-600 dark:text-white hover:bg-pink-200 dark:hover:bg-slate-500")} title="Previous Year">‹‹</button>
                    <button onClick={() => setDate(new Date(year, month - 1, 1))} className={cn("p-2 w-10 border-4 border-black dark:border-slate-600", "bg-pink-500 text-white hover:bg-pink-400 dark:bg-pink-600 dark:hover:bg-pink-500")}><Icon name="ChevronLeft" /></button>
                    <button onClick={goToToday} className={cn("px-3 py-2 text-xs font-bold border-4 border-black dark:border-slate-600", "bg-white dark:bg-slate-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-600")}>Today</button>
                    <button onClick={() => setDate(new Date(year, month + 1, 1))} className={cn("p-2 w-10 border-4 border-black dark:border-slate-600", "bg-pink-500 text-white hover:bg-pink-400 dark:bg-pink-600 dark:hover:bg-pink-500")}><Icon name="ChevronRight" /></button>
                    <button onClick={() => setDate(new Date(year + 1, month, 1))} className={cn("p-2 w-10 text-xs font-bold border-4 border-black dark:border-slate-600", "bg-pink-300 dark:bg-slate-600 dark:text-white hover:bg-pink-200 dark:hover:bg-slate-500")} title="Next Year">››</button>
                </div>
            </div>

            {/* Add Event Form */}
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
                    + Add Event
                </button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-4 text-[10px] font-bold">
                <span className="px-2 py-1 bg-green-400 border border-black">Release</span>
                <span className="px-2 py-1 bg-blue-500 text-white border border-black">Event</span>
                <span className="px-2 py-1 bg-pink-500 text-white border border-black">Task</span>
                <span className="px-2 py-1 bg-purple-500 text-white border border-black">Song</span>
                <span className="px-2 py-1 bg-indigo-400 text-white border border-black">Version</span>
                <span className="px-2 py-1 bg-orange-500 text-white border border-black">Video</span>
                <span className="px-2 py-1 bg-yellow-400 border border-black">Global Task</span>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-black border-4 border-black text-center font-black text-white mb-px">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="py-3">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px bg-black border-4 border-black flex-1 overflow-y-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="bg-gray-100 h-24"></div>)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const list = items[dateStr] || [];
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    return (
                        <div key={d} className={cn("bg-white h-24 p-1 overflow-y-auto border-r border-b border-black hover:bg-yellow-50", isToday && "ring-2 ring-inset ring-pink-500")}>
                            <div className={cn("text-xs font-bold mb-1", isToday && "text-pink-600")}>{d}</div>
                            {list.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => handleItemClick(t)}
                                    className={cn(
                                        "text-[10px] p-1 mb-1 font-bold uppercase truncate border border-black cursor-pointer hover:opacity-80",
                                        getItemColor(t._kind)
                                    )}
                                    title={t.description || t.title}
                                >
                                    {t.title}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* Detail Modal for clicked items */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
                    <div className={cn("w-full max-w-md p-6 bg-white", THEME.punk.card)} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-black uppercase">{selectedItem.title}</h3>
                            <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-gray-200"><Icon name="X" size={16} /></button>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div><span className="font-bold">Type:</span> {selectedItem._kind}</div>
                            <div><span className="font-bold">Date:</span> {selectedItem.date}</div>
                            {selectedItem.status && <div><span className="font-bold">Status:</span> {selectedItem.status}</div>}
                            {selectedItem.description && <div><span className="font-bold">Description:</span> {selectedItem.description}</div>}
                            {selectedItem.releaseType && <div><span className="font-bold">Release Type:</span> {selectedItem.releaseType}</div>}
                        </div>
                        {selectedItem._kind === 'event' && (
                            <button 
                                onClick={() => { actions.delete('events', selectedItem.id); setSelectedItem(null); }} 
                                className={cn("mt-4 px-4 py-2 w-full", THEME.punk.btn, "bg-red-500 text-white")}
                            >
                                Delete Event
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const GalleryView = () => {
    const { data, actions } = useStore();
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [editingPhoto, setEditingPhoto] = useState(null);

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            actions.add('photos', { 
                data: ev.target.result, 
                name: file.name,
                title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                description: '',
                uploadedAt: new Date().toISOString()
            });
        };
        reader.readAsDataURL(file);
    };

    const handleDownload = (photo) => {
        const link = document.createElement('a');
        link.href = photo.data;
        link.download = photo.name || 'photo.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = () => {
        data.photos.forEach((photo, index) => {
            setTimeout(() => {
                handleDownload(photo);
            }, index * 300); // Stagger downloads
        });
    };

    const handleUpdatePhoto = (photoId, updates) => {
        actions.update('photos', photoId, updates);
    };

    return (
        <div className="p-6 pb-24">
            <div className="flex flex-wrap justify-between items-center mb-8 border-b-4 border-black pb-4 gap-4">
                <h2 className={cn("text-3xl flex items-center gap-2", THEME.punk.textStyle)}><Icon name="Image" /> Gallery</h2>
                <div className="flex gap-2">
                    {data.photos.length > 0 && (
                        <button onClick={handleDownloadAll} className={cn("px-4 py-2 flex items-center gap-2", THEME.punk.btn, "bg-blue-500 text-white")}>
                            <Icon name="Download" size={16}/> Download All
                        </button>
                    )}
                    <label className={cn("px-4 py-2 cursor-pointer bg-white flex items-center gap-2", THEME.punk.btn)}>
                        <Icon name="Upload" size={16}/> Upload
                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                    </label>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.photos.map(p => (
                    <div key={p.id} className={cn("relative aspect-square group overflow-hidden cursor-pointer", THEME.punk.card)}>
                        <img 
                            src={p.data} 
                            alt={p.title || p.name}
                            className="w-full h-full object-cover"
                            onClick={() => setSelectedPhoto(p)}
                        />
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDownload(p)} className="bg-blue-500 text-white p-1 rounded" title="Download"><Icon name="Download" size={14} /></button>
                            <button onClick={() => setEditingPhoto(p)} className="bg-yellow-500 text-white p-1 rounded" title="Edit"><Icon name="Settings" size={14} /></button>
                            <button onClick={() => actions.delete('photos', p.id)} className="bg-red-500 text-white p-1 rounded" title="Delete"><Icon name="Trash2" size={14} /></button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-[10px] p-1">
                            <div className="truncate font-bold">{p.title || p.name}</div>
                            {p.description && <div className="truncate opacity-80">{p.description}</div>}
                        </div>
                    </div>
                ))}
                {data.photos.length === 0 && <div className="col-span-full py-20 text-center opacity-50">No photos yet.</div>}
            </div>

            {/* Photo Enlargement Modal */}
            {selectedPhoto && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-white">
                                <div className="font-bold text-lg">{selectedPhoto.title || selectedPhoto.name}</div>
                                {selectedPhoto.description && <div className="text-sm opacity-80">{selectedPhoto.description}</div>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleDownload(selectedPhoto)} className="p-2 bg-blue-500 text-white rounded" title="Download"><Icon name="Download" size={20} /></button>
                                <button onClick={() => { setEditingPhoto(selectedPhoto); setSelectedPhoto(null); }} className="p-2 bg-yellow-500 text-white rounded" title="Edit"><Icon name="Settings" size={20} /></button>
                                <button onClick={() => setSelectedPhoto(null)} className="p-2 bg-gray-500 text-white rounded"><Icon name="X" size={20} /></button>
                            </div>
                        </div>
                        <img 
                            src={selectedPhoto.data} 
                            alt={selectedPhoto.title || selectedPhoto.name}
                            className="max-w-full max-h-[80vh] object-contain border-4 border-white"
                        />
                    </div>
                </div>
            )}

            {/* Edit Photo Modal */}
            {editingPhoto && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setEditingPhoto(null)}>
                    <div className={cn("w-full max-w-md p-6 bg-white", THEME.punk.card)} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black uppercase">Edit Photo</h3>
                            <button onClick={() => setEditingPhoto(null)} className="p-1 hover:bg-gray-200"><Icon name="X" size={16} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Title</label>
                                <input 
                                    value={editingPhoto.title || ''} 
                                    onChange={e => setEditingPhoto(prev => ({ ...prev, title: e.target.value }))} 
                                    className={cn("w-full", THEME.punk.input)} 
                                    placeholder="Photo title"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Description</label>
                                <textarea 
                                    value={editingPhoto.description || ''} 
                                    onChange={e => setEditingPhoto(prev => ({ ...prev, description: e.target.value }))} 
                                    className={cn("w-full h-24", THEME.punk.input)} 
                                    placeholder="Photo description"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => {
                                        handleUpdatePhoto(editingPhoto.id, { title: editingPhoto.title, description: editingPhoto.description });
                                        setEditingPhoto(null);
                                    }} 
                                    className={cn("flex-1 px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}
                                >
                                    Save
                                </button>
                                <button onClick={() => setEditingPhoto(null)} className={cn("flex-1 px-4 py-2 bg-gray-300", THEME.punk.btn)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const TeamView = () => {
    const { data, actions } = useStore();
    const [newMember, setNewMember] = useState({ 
        name: '', 
        role: '', 
        type: 'individual', 
        phone: '', 
        email: '', 
        notes: '', 
        companyId: '',
        isMusician: false,
        instruments: []
    });
    const [editingMember, setEditingMember] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all', 'musicians', 'individual', 'company'
    const companies = (data.teamMembers || []).filter(m => m.type === 'company');

    const handleAdd = async () => {
        if (!newMember.name) return;
        await actions.addTeamMember(newMember);
        setNewMember({ name: '', role: '', type: 'individual', phone: '', email: '', notes: '', companyId: '', isMusician: false, instruments: [] });
    };

    const handleUpdateMember = async () => {
        if (editingMember) {
            await actions.updateTeamMember(editingMember.id, editingMember);
            setEditingMember(null);
        }
    };

    const filteredMembers = useMemo(() => {
        let members = data.teamMembers || [];
        if (filter === 'musicians') {
            members = members.filter(m => m.isMusician);
        } else if (filter === 'individual') {
            members = members.filter(m => m.type === 'individual');
        } else if (filter === 'company') {
            members = members.filter(m => m.type === 'company');
        }
        return members;
    }, [data.teamMembers, filter]);

    return (
        <div className="p-6 pb-24">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className={THEME.punk.textStyle}>Team</h2>
                <div className="flex gap-2">
                    <select value={filter} onChange={e => setFilter(e.target.value)} className={cn("px-3 py-2", THEME.punk.input)}>
                        <option value="all">All Members</option>
                        <option value="musicians">Musicians Only</option>
                        <option value="individual">Individuals</option>
                        <option value="company">Companies</option>
                    </select>
                </div>
            </div>
            
            <div className={cn("p-4 mb-6", THEME.punk.card)}>
                <h3 className="font-black uppercase mb-4 border-b-2 border-black pb-2">Add New Team Member</h3>
                <div className="grid md:grid-cols-2 gap-4">
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
                    
                    {/* Phase 8: Musician flag and instruments */}
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 font-bold">
                            <input 
                                type="checkbox" 
                                checked={newMember.isMusician || false} 
                                onChange={e => setNewMember({ ...newMember, isMusician: e.target.checked })} 
                                className="w-5 h-5" 
                            />
                            Is Musician
                        </label>
                    </div>
                    {newMember.isMusician && (
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1">Instruments (comma-separated)</label>
                            <input 
                                value={(newMember.instruments || []).join(', ')} 
                                onChange={e => setNewMember({ ...newMember, instruments: e.target.value.split(',').map(i => i.trim()).filter(Boolean) })} 
                                placeholder="guitar, piano, drums"
                                className={cn("w-full", THEME.punk.input)} 
                            />
                        </div>
                    )}
                    
                    <textarea value={newMember.notes} onChange={e => setNewMember({ ...newMember, notes: e.target.value })} placeholder="Notes" className={cn("w-full h-20", THEME.punk.input)} />
                    <button onClick={handleAdd} className={cn("px-4 py-2", THEME.punk.btn, "bg-black text-white")}>
                        + Add Team Member
                    </button>
                </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
                {filteredMembers.map(v => (
                    <div key={v.id} className={cn("p-4 relative space-y-1", THEME.punk.card)}>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{v.name}</h3>
                            {v.isMusician && <span className="px-2 py-1 bg-purple-200 text-purple-800 text-[10px] font-bold border border-purple-500">🎵 MUSICIAN</span>}
                        </div>
                        <p className="text-sm opacity-80">{v.role || v.type}</p>
                        {v.companyId && <p className="text-xs font-bold">Linked: {companies.find(c => c.id === v.companyId)?.name || 'Company'}</p>}
                        {v.email && <p className="text-xs">📧 {v.email}</p>}
                        {v.phone && <p className="text-xs">📞 {v.phone}</p>}
                        {v.isMusician && v.instruments && v.instruments.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {v.instruments.map(inst => (
                                    <span key={inst} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-[10px] font-bold border border-indigo-300">
                                        {inst}
                                    </span>
                                ))}
                            </div>
                        )}
                        {v.notes && <p className="text-xs opacity-70 mt-2">{v.notes}</p>}
                        <div className="absolute top-2 right-2 flex gap-1">
                            <button onClick={() => setEditingMember({...v})} className="text-blue-500 hover:bg-blue-100 p-1"><Icon name="Settings" size={16}/></button>
                            <button onClick={() => actions.deleteTeamMember(v.id)} className="text-red-500 hover:bg-red-100 p-1"><Icon name="Trash2" size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>
            
            {filteredMembers.length === 0 && (
                <div className="text-center py-10 opacity-50">No team members found.</div>
            )}

            {/* Edit Member Modal */}
            {editingMember && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setEditingMember(null)}>
                    <div className={cn("w-full max-w-md p-6 bg-white max-h-[90vh] overflow-y-auto", THEME.punk.card)} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black uppercase">Edit Team Member</h3>
                            <button onClick={() => setEditingMember(null)} className="p-1 hover:bg-gray-200"><Icon name="X" size={16} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Name</label>
                                <input value={editingMember.name || ''} onChange={e => setEditingMember(prev => ({ ...prev, name: e.target.value }))} className={cn("w-full", THEME.punk.input)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Role</label>
                                <input value={editingMember.role || ''} onChange={e => setEditingMember(prev => ({ ...prev, role: e.target.value }))} className={cn("w-full", THEME.punk.input)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Type</label>
                                <select value={editingMember.type} onChange={e => setEditingMember(prev => ({ ...prev, type: e.target.value }))} className={cn("w-full", THEME.punk.input)}>
                                    <option value="individual">Individual</option>
                                    <option value="company">Company</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Phone</label>
                                <input value={editingMember.phone || ''} onChange={e => setEditingMember(prev => ({ ...prev, phone: e.target.value }))} className={cn("w-full", THEME.punk.input)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Email</label>
                                <input value={editingMember.email || ''} onChange={e => setEditingMember(prev => ({ ...prev, email: e.target.value }))} className={cn("w-full", THEME.punk.input)} />
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    checked={editingMember.isMusician || false} 
                                    onChange={e => setEditingMember(prev => ({ ...prev, isMusician: e.target.checked }))} 
                                    className="w-5 h-5" 
                                />
                                <label className="font-bold">Is Musician</label>
                            </div>
                            {editingMember.isMusician && (
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-1">Instruments</label>
                                    <input 
                                        value={(editingMember.instruments || []).join(', ')} 
                                        onChange={e => setEditingMember(prev => ({ ...prev, instruments: e.target.value.split(',').map(i => i.trim()).filter(Boolean) }))} 
                                        placeholder="guitar, piano, drums"
                                        className={cn("w-full", THEME.punk.input)} 
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold uppercase mb-1">Notes</label>
                                <textarea value={editingMember.notes || ''} onChange={e => setEditingMember(prev => ({ ...prev, notes: e.target.value }))} className={cn("w-full h-20", THEME.punk.input)} />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleUpdateMember} className={cn("flex-1 px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>Save</button>
                                <button onClick={() => setEditingMember(null)} className={cn("flex-1 px-4 py-2 bg-gray-300", THEME.punk.btn)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
