import { useState, useEffect } from 'react';
import { Music, List, Zap, Image, Users, Receipt, Calendar, PieChart, Archive, Settings, Menu, X, ChevronDown, ChevronRight, Plus, Split, Folder, Circle, PlayCircle, Activity, CheckCircle, Trash2, Camera, Download, Copy, Upload, DollarSign, TrendingUp } from 'lucide-react';
import { useStore, STATUS_OPTIONS, getEffectiveCost } from './Store';
import { THEME, COLORS, formatMoney, STAGES, cn } from './utils';

export const Icon = ({ name, ...props }) => {
  const icons = { Music, List, Zap, Image, Users, Receipt, Calendar, PieChart, Archive, Settings, Menu, X, ChevronDown, ChevronRight, Plus, Split, Folder, Circle, PlayCircle, Activity, CheckCircle, Trash2, Camera, Download, Copy, Upload, DollarSign, TrendingUp };
  const I = icons[name] || Circle;
  return <I {...props} />;
};

export const Sidebar = ({ isOpen, setIsOpen, activeTab, setActiveTab }) => {
  const { data, stats } = useStore();
  const settings = data.settings || {};
  const colorClass = COLORS[settings.themeColor || 'pink'].split(' ')[2]; 
  const isDark = settings.themeMode === 'dark';

  const menu = [
      // New Spec Views (primary) - Following unified Item/Page architecture
      { id: 'songs', label: 'Songs', icon: 'Music' },
      { id: 'videos', label: 'Videos', icon: 'PlayCircle' },
      { id: 'events', label: 'Events', icon: 'Calendar' },
      { id: 'releases', label: 'Releases', icon: 'Download' },
      { id: 'expenses', label: 'Expenses', icon: 'Receipt' },
      { id: 'globalTasks', label: 'Global Tasks', icon: 'Activity' },
      { id: 'timeline', label: 'Timeline', icon: 'List' },
      { id: 'dashboard', label: 'Dashboard', icon: 'PieChart' },
      { id: 'financials', label: 'Financials', icon: 'DollarSign' },
      { id: 'progress', label: 'Progress', icon: 'TrendingUp' },
      // Original views (secondary)
      { id: 'active', label: 'Active', icon: 'Zap' },
      { id: 'calendar', label: 'Calendar View', icon: 'Calendar' },
      { id: 'gallery', label: 'Photos', icon: 'Image' },
      { id: 'team', label: 'Team', icon: 'Users' },
      { id: 'archive', label: 'Trash', icon: 'Archive' },
      { id: 'settings', label: 'Settings', icon: 'Settings' },
  ];

    return (
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 flex flex-col punk-panel",
        isDark ? "text-slate-50" : "text-slate-900",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className={cn(
          "p-6 border-b-[3px] flex justify-between items-center",
          isDark ? "bg-slate-900 border-slate-600" : "bg-gray-50 border-black"
        )}>
          <div>
             <h1 className={cn("text-xl flex items-center gap-2 punk-accent-underline", THEME.punk.textStyle, colorClass)}><Icon name="Music" /> TRACKER</h1>
             <div className={cn("text-xs font-bold mt-1", isDark ? "text-slate-400" : "opacity-60")}>{settings.artistName || 'Artist'}</div>
          </div>
          <button onClick={() => setIsOpen(false)} className={cn("md:hidden", isDark && "text-slate-50") }><Icon name="X" /></button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
           {menu.map(i => (
              <button key={i.id} onClick={() => {setActiveTab(i.id); setIsOpen(false)}}
                 className={cn(
                   "w-full flex items-center gap-3 px-4 py-3 text-left font-bold uppercase tracking-wide border-[3px] transition-transform hover:-translate-y-0.5",
                   isDark ? "border-slate-600" : "border-black",
                   activeTab === i.id
                     ? "bg-[var(--accent)] text-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.35)]"
                     : (isDark ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-white hover:bg-[var(--accent-soft)]")
                 )}>
                 <Icon name={i.icon} size={18} /> {i.label}
              </button>
           ))}
        </nav>
        <div className={cn(
          "p-4 m-4 border-[3px] punk-panel",
          isDark ? "border-slate-600" : "border-black"
        )}>
          <div className={cn("text-xs font-black uppercase mb-2", isDark ? "text-slate-400" : "opacity-50")}>Rollout Cost</div>
          <div className={cn("text-2xl font-black", colorClass)}>{formatMoney(stats.grandTotal || stats.act || 0)}</div>
          <div className={cn("text-xs font-bold mt-1 space-y-1", isDark && "text-slate-300")}>
             <div className="flex justify-between"><span>Songs:</span><span>{formatMoney(stats.songsTotal || 0)}</span></div>
             <div className="flex justify-between"><span>Global:</span><span>{formatMoney(stats.globalTasksTotal || 0)}</span></div>
             <div className="flex justify-between"><span>Releases:</span><span>{formatMoney(stats.releasesTotal || 0)}</span></div>
             <div className="flex justify-between"><span>Expenses:</span><span>{formatMoney(stats.expensesTotal || 0)}</span></div>
          </div>
      </div>
    </div>
  );
};

export const Editor = ({ task, onClose }) => {
    const { actions, data } = useStore();
    const [form, setForm] = useState(task ? {...task} : {});
    const [tab, setTab] = useState('details');
    const [sub, setSub] = useState('');
    const artistName = data.settings?.artistName || 'Artist';

    useEffect(() => {
        if (task) setForm({...task});
    }, [task]);

    if (!task) return null;

    const save = async () => {
        // eslint-disable-next-line no-unused-vars
        const { children, ...clean } = form;
        ['estimatedCost', 'quotedCost', 'actualCost'].forEach(k => { if (isNaN(clean[k])) clean[k] = 0; });
        await actions.update('tasks', form.id, clean);
        onClose();
    };

    const handleUpload = (e) => {
       const file = e.target.files[0];
       if (!file) return;
       const reader = new FileReader();
       reader.onload = (ev) => {
           actions.add('photos', { taskId: form.id, data: ev.target.result, name: file.name });
       };
       reader.readAsDataURL(file);
    };

    const photos = (data.photos || []).filter(p => p.taskId === form.id);

    return (
        <div className={cn("fixed inset-y-0 right-0 w-full md:w-[500px] bg-white z-50 shadow-2xl flex flex-col", THEME.punk.font, "border-l-4 border-black")}>
            <div className="p-4 border-b-4 border-black flex justify-between bg-gray-100">
                <span className="font-bold uppercase">Edit {form.isCategory ? 'Category' : 'Task'}</span>
                <div className="flex gap-2">
                    <button onClick={() => { actions.archiveItem('tasks', form.id, 'Editor archive'); onClose(); }} className="p-2 hover:bg-red-100 text-red-500"><Icon name="Trash2"/></button>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200"><Icon name="X"/></button>
                </div>
            </div>
            <div className="flex border-b-4 border-black">
                {['details', 'finance', 'photos'].map(t => (
                    <button key={t} onClick={() => setTab(t)} className={cn("flex-1 py-3 uppercase font-bold", tab === t ? "bg-black text-white" : "hover:bg-gray-100")}>{t}</button>
                ))}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {tab === 'details' && (
                    <>
                       {!form.isCategory && (
                          <div className={cn("p-4 bg-gray-50 flex gap-2", THEME.punk.card)}>
                             {Object.entries(STAGES).map(([k, v]) => (
                                <button key={k} onClick={() => setForm({...form, status: k})} className={cn("flex-1 py-2 text-[10px] font-bold uppercase border-2 border-black", form.status === k ? "bg-black text-white" : "bg-white")}>{v.label}</button>
                             ))}
                          </div>
                       )}
                        <input value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} className={cn("w-full", THEME.punk.input)} placeholder="TITLE" />
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold opacity-50">Checklist</label><select value={form.checklistState || ''} onChange={e => setForm({...form, checklistState: e.target.value})} className={cn("w-full", THEME.punk.input)}>{['', 'Complete', 'Paid', 'Complete but unpaid', 'Paid but incomplete', 'Archived'].map(s => <option key={s} value={s}>{s || 'Select state'}</option>)}</select></div>
                            <div><label className="text-xs font-bold opacity-50">Stage</label><select value={form.stageId || ''} onChange={e => setForm({...form, stageId: e.target.value})} className={cn("w-full", THEME.punk.input)}>{data.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                            <div><label className="text-xs font-bold opacity-50">Due</label><input type="date" value={form.dueDate || ''} onChange={e => setForm({...form, dueDate: e.target.value})} className={cn("w-full", THEME.punk.input)} /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold opacity-50">Notes</label>
                            <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className={cn("w-full h-20", THEME.punk.input)} placeholder="Context, exclusivity, platform info" />
                          </div>
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs font-bold opacity-50">Exclusivity</label>
                              <input value={form.exclusiveType || ''} onChange={e => setForm({ ...form, exclusiveType: e.target.value })} className={cn("w-full", THEME.punk.input)} placeholder="Platform exclusive, radio-only, etc." />
                            </div>
                            <div>
                              <label className="text-xs font-bold opacity-50">Instruments / Platforms</label>
                              <input value={form.instruments || ''} onChange={e => setForm({ ...form, instruments: e.target.value })} className={cn("w-full", THEME.punk.input)} placeholder="Guitar, synth, TikTok, YouTube" />
                            </div>
                          </div>
                        </div>
                        <button onClick={() => setForm({...form, assignees: Array.from(new Set([...(form.assignees || []), artistName]))})} className={cn("px-3 py-2 text-xs", THEME.punk.btn)}>
                          Assign me ({artistName})
                         </button>
                         <div className="border-t-4 border-black pt-4">
                            <div className="flex gap-2">
                               <input value={sub} onChange={e => setSub(e.target.value)} className={cn("w-full", THEME.punk.input)} placeholder="Quick sub-task..." onKeyDown={e => { if(e.key === 'Enter') { actions.add('tasks', { title: sub, parentId: form.id, status: 'todo' }); setSub(''); }}} />
                               <button onClick={() => { actions.add('tasks', { title: sub, parentId: form.id, status: 'todo' }); setSub(''); }} className={cn("px-4", THEME.punk.btn, "bg-black text-white")}>Add</button>
                            </div>
                       </div>
                    </>
                )}
                {tab === 'finance' && (
                    <div className={cn("p-4 space-y-4", THEME.punk.card)}>
                        <div className="grid grid-cols-3 gap-2">
                            {['Estimated', 'Quoted', 'Actual'].map(k => (
                                <div key={k}><label className="text-[10px] font-bold uppercase opacity-50">{k}</label><input type="number" value={form[`${k.toLowerCase()}Cost`] || 0} onChange={e => setForm({...form, [`${k.toLowerCase()}Cost`]: parseFloat(e.target.value) || 0})} className={cn("w-full text-sm", THEME.punk.input)} /></div>
                            ))}
                        </div>
                        <div><label className="text-[10px] font-bold uppercase opacity-50">Vendor</label><select value={form.vendorId || ''} onChange={e => setForm({...form, vendorId: e.target.value})} className={cn("w-full text-sm", THEME.punk.input)}><option value="">--</option>{data.vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                    </div>
                )}
                {tab === 'photos' && (
                    <div className="space-y-4">
                        <label className="w-full h-24 border-2 border-dashed border-gray-400 flex items-center justify-center cursor-pointer hover:bg-gray-50"><Icon name="Camera" className="opacity-50" /><input type="file" accept="image/*" onChange={handleUpload} className="hidden" /></label>
                        <div className="grid grid-cols-2 gap-2">{photos.map(p => <div key={p.id} className="relative aspect-square"><img src={p.data} className="w-full h-full object-cover border-2 border-black" /><button onClick={() => actions.delete('photos', p.id)} className="absolute top-1 right-1 bg-red-500 text-white p-1"><Icon name="X" size={12} /></button></div>)}</div>
                    </div>
                )}
            </div>
            <div className="p-4 border-t-4 border-black bg-white"><button onClick={save} className={cn("w-full py-3", THEME.punk.btn, "bg-black text-white")}>Save Changes</button></div>
        </div>
    );
};

// Phase 4: Unified Task Editor Component
// Provides consistent task editing interface across songs, versions, videos, releases, global tasks, and events
export const UnifiedTaskEditor = ({ 
    task, 
    onSave, 
    onCancel, 
    onDelete,
    showSourceInfo = false,
    sourceLabel = '',
    sourceName = '',
    teamMembers = []
}) => {
    const [form, setForm] = useState({ ...task });
    const [newAssignment, setNewAssignment] = useState({ memberId: '', cost: 0, instrument: '' });
    const [budgetError, setBudgetError] = useState(false);

    useEffect(() => {
        setForm({ ...task });
    }, [task]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (onSave) onSave(form);
    };

    const addAssignment = () => {
        if (!newAssignment.memberId) return;
        const budget = getEffectiveCost(form);
        const current = (form.assignedMembers || []).reduce((s, m) => s + (parseFloat(m.cost) || 0), 0);
        const nextTotal = current + (parseFloat(newAssignment.cost) || 0);
        if (budget > 0 && nextTotal > budget) {
            setBudgetError(true);
            setTimeout(() => setBudgetError(false), 3000);
            return;
        }
        setBudgetError(false);
        const updatedMembers = [...(form.assignedMembers || []), {
            memberId: newAssignment.memberId,
            cost: parseFloat(newAssignment.cost) || 0,
            instrument: newAssignment.instrument || ''
        }];
        handleChange('assignedMembers', updatedMembers);
        setNewAssignment({ memberId: '', cost: 0, instrument: '' });
    };

    const removeAssignment = (index) => {
        const updatedMembers = (form.assignedMembers || []).filter((_, i) => i !== index);
        handleChange('assignedMembers', updatedMembers);
    };

    const budget = getEffectiveCost(form);
    const allocated = (form.assignedMembers || []).reduce((s, m) => s + (m.cost || 0), 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
            <div className={cn("w-full max-w-lg p-6 bg-white max-h-[90vh] overflow-y-auto", THEME.punk.card)} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
                    <h3 className="font-black uppercase">{form.type || form.title || 'Edit Task'}</h3>
                    <button onClick={onCancel} className="p-1 hover:bg-gray-200"><Icon name="X" size={16} /></button>
                </div>

                {showSourceInfo && (
                    <div className="mb-4 p-2 bg-gray-100 border-2 border-black text-xs">
                        <span className="font-bold">{sourceLabel}:</span> {sourceName}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Title/Type */}
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Task Name</label>
                        <input 
                            value={form.title || form.type || ''} 
                            onChange={e => handleChange(form.title !== undefined ? 'title' : 'type', e.target.value)} 
                            className={cn("w-full", THEME.punk.input)} 
                        />
                    </div>

                    {/* Date and Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1">Due Date</label>
                            <input 
                                type="date" 
                                value={form.date || form.dueDate || ''} 
                                onChange={e => handleChange(form.date !== undefined ? 'date' : 'dueDate', e.target.value)} 
                                className={cn("w-full", THEME.punk.input)} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1">Status</label>
                            <select
                                value={form.status || 'Not Started'}
                                onChange={e => handleChange('status', e.target.value)}
                                className={cn("w-full", THEME.punk.input)}
                            >
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Cost Layers */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1">Estimated</label>
                            <input 
                                type="number" 
                                value={form.estimatedCost || 0} 
                                onChange={e => handleChange('estimatedCost', parseFloat(e.target.value) || 0)} 
                                className={cn("w-full text-sm", THEME.punk.input)} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1">Quoted</label>
                            <input 
                                type="number" 
                                value={form.quotedCost || 0} 
                                onChange={e => handleChange('quotedCost', parseFloat(e.target.value) || 0)} 
                                className={cn("w-full text-sm", THEME.punk.input)} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1">Paid</label>
                            <input 
                                type="number" 
                                value={form.paidCost || 0} 
                                onChange={e => handleChange('paidCost', parseFloat(e.target.value) || 0)} 
                                className={cn("w-full text-sm", THEME.punk.input)} 
                            />
                        </div>
                    </div>

                    {/* Description/Notes */}
                    <div>
                        <label className="block text-xs font-bold uppercase mb-1">Notes</label>
                        <textarea 
                            value={form.notes || form.description || ''} 
                            onChange={e => handleChange(form.notes !== undefined ? 'notes' : 'description', e.target.value)} 
                            className={cn("w-full h-20", THEME.punk.input)} 
                            placeholder="Additional details..."
                        />
                    </div>

                    {/* Team Member Assignments */}
                    <div className="border-t-2 border-black pt-4">
                        <label className="block text-xs font-bold uppercase mb-2">Team Assignments</label>
                        {budget > 0 && (
                            <div className="text-xs mb-2 p-2 bg-gray-100 border border-black">
                                Budget: {formatMoney(budget)} | Allocated: {formatMoney(allocated)} | Remaining: {formatMoney(budget - allocated)}
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2 mb-2">
                            {(form.assignedMembers || []).map((m, idx) => {
                                const member = teamMembers.find(tm => tm.id === m.memberId);
                                return (
                                    <span key={idx} className="px-2 py-1 border-2 border-black bg-purple-100 text-xs font-bold flex items-center gap-2">
                                {member?.name || 'Member'} {m.instrument ? `• ${m.instrument}` : ''} ({formatMoney(m.cost)})
                                        <button onClick={() => removeAssignment(idx)} className="text-red-600">×</button>
                                    </span>
                                );
                            })}
                        </div>
                        <div className="flex gap-2 items-center">
                            <select 
                                value={newAssignment.memberId} 
                                onChange={e => setNewAssignment(prev => ({ ...prev, memberId: e.target.value }))} 
                                className={cn("flex-1 text-xs", THEME.punk.input)}
                            >
                                <option value="">Select member...</option>
                                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <input
                                type="number"
                                value={newAssignment.cost || ''}
                                onChange={e => setNewAssignment(prev => ({ ...prev, cost: e.target.value }))} 
                                placeholder="Cost" 
                                className={cn("w-20 text-xs", THEME.punk.input)}
                            />
                            <input
                                value={newAssignment.instrument || ''}
                                onChange={e => setNewAssignment(prev => ({ ...prev, instrument: e.target.value }))}
                                placeholder="Instrument"
                                className={cn("w-32 text-xs", THEME.punk.input)}
                            />
                            <button onClick={addAssignment} className={cn("px-3 py-2 text-xs", THEME.punk.btn, "bg-purple-600 text-white")}>Add</button>
                        </div>
                        {budgetError && (
                            <div className="text-xs text-red-600 font-bold mt-1 p-2 bg-red-50 border border-red-300">
                                ⚠️ Cannot exceed task budget. Reduce the cost amount.
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-6 pt-4 border-t-4 border-black">
                    <button onClick={handleSave} className={cn("flex-1 px-4 py-2", THEME.punk.btn, "bg-green-500 text-white")}>
                        Save Changes
                    </button>
                    {onDelete && (
                        <button onClick={onDelete} className={cn("px-4 py-2", THEME.punk.btn, "bg-red-500 text-white")}>
                            <Icon name="Trash2" size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};