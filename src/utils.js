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

export const THEME = {
  punk: {
    font: "font-mono",
    border: "border-4 border-black",
    rounded: "rounded-none",
    shadow: "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    textStyle: "uppercase font-black tracking-widest",
    btn: "border-4 border-black font-black uppercase tracking-widest hover:-translate-y-1 active:translate-y-0 transition-transform bg-white",
    input: "border-4 border-black font-bold p-3 focus:ring-0 outline-none bg-white",
    card: "bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
  }
};

export const COLORS = {
  pink: 'bg-pink-500 border-pink-500 text-pink-500',
  cyan: 'bg-cyan-400 border-cyan-400 text-cyan-400',
  lime: 'bg-lime-400 border-lime-400 text-lime-600',
  violet: 'bg-violet-500 border-violet-500 text-violet-500',
};

export const STAGES = {
  todo: { label: 'To Do', icon: 'Circle' },
  in_progress: { label: 'In Progress', icon: 'PlayCircle' },
  review: { label: 'Review', icon: 'Activity' },
  done: { label: 'Done', icon: 'CheckCircle' }
};