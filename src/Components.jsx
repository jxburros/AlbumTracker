import { useState, useEffect } from 'react';
import { Music, List, Zap, Image, Users, Receipt, Calendar, PieChart, Archive, Settings, Menu, X, ChevronDown, ChevronRight, Plus, Split, Folder, Circle, PlayCircle, Activity, CheckCircle, Trash2, Camera, Download, Copy } from 'lucide-react';
import { useStore } from './Store';
import { THEME, COLORS, formatMoney, STAGES, cn } from './utils';

export const Icon = ({ name, ...props }) => {
  const icons = { Music, List, Zap, Image, Users, Receipt, Calendar, PieChart, Archive, Settings, Menu, X, ChevronDown, ChevronRight, Plus, Split, Folder, Circle, PlayCircle, Activity, CheckCircle, Trash2, Camera, Download, Copy };
  const I = icons[name] || Circle;
  return <I {...props} />;
};

export const Sidebar = ({ isOpen, setIsOpen, activeTab, setActiveTab }) => {
  const { data, stats } = useStore();
  const settings = data.settings || {};
  const colorClass = COLORS[settings.themeColor || 'pink'].split(' ')[2]; 

  const menu = [
      // New Spec Views (primary)
      { id: 'songs', label: 'Songs', icon: 'Music' },
      { id: 'videos', label: 'Videos', icon: 'PlayCircle' },
      { id: 'globalTasks', label: 'Global Tasks', icon: 'Activity' },
      { id: 'releases', label: 'Releases', icon: 'Download' },
      { id: 'timeline', label: 'Timeline', icon: 'Calendar' },
      { id: 'dashboard', label: 'Dashboard', icon: 'PieChart' },
      // Original views (secondary)
      { id: 'active', label: 'Active', icon: 'Zap' },
      { id: 'calendar', label: 'Calendar', icon: 'Calendar' },
      { id: 'gallery', label: 'Photos', icon: 'Image' },
      { id: 'team', label: 'Team', icon: 'Users' },
      { id: 'misc', label: 'Expenses', icon: 'Receipt' },
      { id: 'archive', label: 'Trash', icon: 'Archive' },
      { id: 'settings', label: 'Settings', icon: 'Settings' },
  ];

  return (
    <div className={cn("fixed inset-y-0 left-0 z-40 w-64 bg-white transform transition-transform duration-200 flex flex-col", THEME.punk.border, "border-y-0 border-l-0", isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")}>
      <div className="p-6 border-b-4 border-black bg-gray-50 flex justify-between items-center">
        <div>
           <h1 className={cn("text-xl flex items-center gap-2", THEME.punk.textStyle, colorClass)}><Icon name="Music" /> TRACKER</h1>
           <div className="text-xs font-bold opacity-60 mt-1">{settings.artistName || 'Artist'}</div>
        </div>
        <button onClick={() => setIsOpen(false)} className="md:hidden"><Icon name="X" /></button>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
         {menu.map(i => (
            <button key={i.id} onClick={() => {setActiveTab(i.id); setIsOpen(false)}} 
               className={cn("w-full flex items-center gap-3 px-4 py-3 text-left", THEME.punk.btn, activeTab === i.id ? `bg-black text-white` : `hover:bg-gray-100`)}>
               <Icon name={i.icon} size={18} /> {i.label}
            </button>
         ))}
      </nav>
      <div className={cn("p-4 m-4 bg-gray-50", THEME.punk.card)}>
          <div className="text-xs font-black uppercase opacity-50 mb-2">Rollout Cost</div>
          <div className={cn("text-2xl font-black", colorClass)}>{formatMoney(stats.grandTotal || stats.act || 0)}</div>
          <div className="text-xs font-bold mt-1 space-y-1">
             <div className="flex justify-between"><span>Songs:</span><span>{formatMoney(stats.songsTotal || 0)}</span></div>
             <div className="flex justify-between"><span>Global:</span><span>{formatMoney(stats.globalTasksTotal || 0)}</span></div>
             <div className="flex justify-between"><span>Releases:</span><span>{formatMoney(stats.releasesTotal || 0)}</span></div>
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
                    <button onClick={() => { actions.update('tasks', form.id, {archived: true}); onClose(); }} className="p-2 hover:bg-red-100 text-red-500"><Icon name="Trash2"/></button>
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