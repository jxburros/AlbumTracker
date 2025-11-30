import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatMoney = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
};

// Phase 10: Dark mode variants
export const THEME = {
  punk: {
    font: "font-mono",
    border: "border-4 border-black dark:border-slate-600",
    rounded: "rounded-none",
    shadow: "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(100,116,139,1)]",
    textStyle: "uppercase font-black tracking-widest",
      btn: "border-[3px] border-black dark:border-slate-600 font-black uppercase tracking-widest hover:-translate-y-1 active:translate-y-0 transition-transform bg-white dark:bg-slate-700 dark:text-slate-50 hover:bg-[var(--accent-soft)] dark:hover:bg-slate-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.85)]",
      input: "border-[3px] border-black dark:border-slate-600 font-bold p-3 focus:ring-0 outline-none bg-white dark:bg-slate-800 dark:text-slate-50",
      card: "bg-[var(--accent-soft)] dark:bg-slate-800 border-[3px] border-black dark:border-slate-600 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.85)] dark:shadow-[6px_6px_0px_0px_rgba(100,116,139,0.85)]"
    }
  };

export const COLORS = {
  pink: 'bg-pink-500 border-pink-500 text-pink-500',
  cyan: 'bg-cyan-400 border-cyan-400 text-cyan-400',
  lime: 'bg-lime-400 border-lime-400 text-lime-600',
  violet: 'bg-violet-500 border-violet-500 text-violet-500',
};

export const COLOR_VALUES = {
  pink: { base: '#ec4899', strong: '#be185d', soft: '#fdf2f8' },
  cyan: { base: '#22d3ee', strong: '#0ea5e9', soft: '#ecfeff' },
  lime: { base: '#a3e635', strong: '#65a30d', soft: '#f7fee7' },
  violet: { base: '#8b5cf6', strong: '#6d28d9', soft: '#f5f3ff' },
};

export const STAGES = {
  todo: { label: 'Not Started', icon: 'Circle' },
  in_progress: { label: 'In Progress', icon: 'PlayCircle' },
  review: { label: 'Review', icon: 'Activity' },
  done: { label: 'Done', icon: 'CheckCircle' }
};