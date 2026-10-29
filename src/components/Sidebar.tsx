import { History, Home, Info, Search, Terminal, Palette } from 'lucide-react';

type Tab = 'home' | 'search' | 'history' | 'servers' | 'logs' | 'about';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  openSettings: () => void;
  isConnected: boolean;
}

const items = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'history', label: 'History', icon: History },
  { id: 'logs', label: 'Console', icon: Terminal },
  { id: 'about', label: 'About', icon: Info },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, openSettings, isConnected }) => (
  <aside className="desktop-sidebar w-64 h-[100dvh] bg-slate-950/90 backdrop-blur-xl border-r border-white/5 flex flex-col p-4 select-none">
    <div className="flex items-center gap-3 px-2 py-2 mb-6">
      <img src="/znight.png" alt="hotdogdot logo" className="w-10 h-10 rounded-2xl object-cover ring-1 ring-sky-400/30 shadow-lg shadow-sky-500/10" />
      <div className="min-w-0">
        <h1 className="font-bold text-lg text-white tracking-tight truncate">hotdogdot</h1>
        <p className="text-[11px] text-sky-400">music, made simple</p>
      </div>
    </div>

    <nav className="space-y-1 flex-1" aria-label="Primary navigation">
      {items.map(({ id, label, icon: Icon }) => (
        <button key={id} onClick={() => setActiveTab(id)} className={`touch-target w-full flex items-center gap-3 px-3 rounded-xl text-sm font-medium transition ${activeTab === id ? 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          <Icon className="w-4 h-4" /><span>{label}</span>
        </button>
      ))}
    </nav>

    <div className="space-y-2 pt-4 border-t border-white/5">
      <div className="flex items-center gap-2 px-3 text-xs text-slate-400">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        {isConnected ? 'Lavalink connected' : 'Local mode'}
      </div>
      <button onClick={openSettings} className="touch-target w-full flex items-center gap-3 px-3 rounded-xl text-sm text-slate-200 bg-white/5 hover:bg-white/10 transition border border-white/5 font-medium">
        <Palette className="w-4 h-4 text-sky-400" /><span>ปรับแต่งธีม & ตั้งค่า</span>
      </button>
      <p className="px-3 pt-1 text-[10px] text-slate-600">© 2026 hotdogdot</p>
    </div>
  </aside>
);
