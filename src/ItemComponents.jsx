import { cn, THEME } from './utils';
import { Icon } from './Components';

// Shared card for songs, versions, videos, releases, and tasks
export const ItemCard = ({ item, onClick }) => (
  <button
    onClick={() => onClick?.(item)}
    className={cn(
      'w-full text-left p-4 border-4 flex flex-col gap-2 hover:-translate-y-0.5 transition-transform',
      THEME.punk.card,
      item.accent || ''
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <div className="font-black uppercase text-sm flex-1 truncate">{item.name}</div>
      {item.primaryDate && <span className="text-[11px] font-bold px-2 py-1 border-2 border-black bg-white">{item.primaryDate}</span>}
    </div>
    {item.stage && <div className="text-[11px] font-bold uppercase text-left opacity-70">{item.stage}</div>}
    <div className="flex flex-wrap gap-2 items-center text-[11px]">
      {item.tags?.map(tag => (
        <span key={tag} className="px-2 py-1 bg-yellow-100 border-2 border-black font-bold">{tag}</span>
      ))}
      {item.progressLabel && (
        <span className="px-2 py-1 bg-green-100 border-2 border-black font-bold">{item.progressLabel}</span>
      )}
    </div>
    {item.teamMembers?.length > 0 && (
      <div className="flex flex-wrap gap-2 text-[11px]">
        {item.teamMembers.map(member => (
          <span key={member} className="px-2 py-1 bg-purple-100 border-2 border-black font-bold flex items-center gap-1">
            <Icon name="Users" size={12} /> {member}
          </span>
        ))}
      </div>
    )}
  </button>
);

// List row version of ItemCard
export const ItemRow = ({ item, onClick }) => (
  <div
    className={cn('p-3 grid grid-cols-6 gap-3 items-center border-b border-gray-200 hover:bg-yellow-50 cursor-pointer', item.accent)}
    onClick={() => onClick?.(item)}
  >
    <div className="font-black truncate">{item.name}</div>
    <div className="text-xs font-bold">{item.primaryDate || '-'}</div>
    <div className="text-xs flex flex-wrap gap-1">
      {item.tags?.map(tag => (
        <span key={tag} className="px-2 py-1 bg-gray-100 border border-black text-[10px] font-bold">{tag}</span>
      ))}
    </div>
    <div className="text-xs font-bold">{item.stage || '-'}</div>
    <div className="text-xs font-bold">{item.progressLabel || '-'}</div>
    <div className="flex flex-wrap gap-1 text-[10px]">
      {item.teamMembers?.map(member => (
        <span key={member} className="px-2 py-1 bg-purple-100 border border-black font-bold flex items-center gap-1">
          <Icon name="Users" size={12} /> {member}
        </span>
      ))}
    </div>
  </div>
);

// Timeline entry component to align date/status/progress across entity types
export const ItemTimelineEntry = ({ item, onClick }) => (
  <div
    className={cn(
      'p-3 mb-2 border-2 border-black bg-white flex flex-col gap-2 hover:-translate-y-0.5 transition-transform cursor-pointer',
      item.accent || ''
    )}
    onClick={() => onClick?.(item)}
  >
    <div className="flex items-center justify-between">
      <div className="font-black uppercase text-sm">{item.name}</div>
      <div className="text-xs font-bold px-2 py-1 bg-black text-white">{item.primaryDate || '-'}</div>
    </div>
    <div className="flex flex-wrap gap-2 text-[11px] items-center">
      <span className="px-2 py-1 bg-white border border-black font-bold">{item.source || 'Item'}</span>
      {item.stage && <span className="px-2 py-1 bg-gray-100 border border-black font-bold">{item.stage}</span>}
      {item.progressLabel && <span className="px-2 py-1 bg-green-100 border border-black font-bold">{item.progressLabel}</span>}
      {item.tags?.map(tag => (
        <span key={tag} className="px-2 py-1 bg-yellow-100 border border-black font-bold">{tag}</span>
      ))}
    </div>
    {item.notes && <div className="text-[11px] opacity-80">{item.notes}</div>}
    {item.teamMembers?.length > 0 && (
      <div className="flex flex-wrap gap-1 text-[10px]">
        {item.teamMembers.map(member => (
          <span key={member} className="px-2 py-1 bg-purple-100 border border-black font-bold flex items-center gap-1">
            <Icon name="Users" size={12} /> {member}
          </span>
        ))}
      </div>
    )}
  </div>
);

// Simple detail pane wrapper to provide consistent headings
export const DetailPane = ({ title, children }) => (
  <div className={cn('p-4 mb-4', THEME.punk.card)}>
    <div className="font-black uppercase border-b-4 border-black pb-2 mb-3 flex items-center gap-2">
      <Icon name="Folder" size={14} /> {title}
    </div>
    <div className="space-y-3 text-sm">{children}</div>
  </div>
);
