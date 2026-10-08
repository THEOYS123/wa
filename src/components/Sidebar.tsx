import React from 'react';
import {
  LayoutDashboard,
  QrCode,
  MessageSquare,
  EyeOff,
  Trash2,
  Sparkles,
  Image,
  Users,
  MessagesSquare,
  Bell,
  HardDrive,
  FileText,
  Activity,
  Settings,
  ShieldAlert,
  TestTube2,
  X,
  Lock,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'connection', label: 'WhatsApp Connection', icon: QrCode, highlight: true },
    { id: 'chats', label: 'Chats & Messages', icon: MessageSquare },
    { id: 'view_once', label: 'View Once Media', icon: EyeOff, badge: 'AUTO-SAVE' },
    { id: 'deleted_messages', label: 'Deleted Messages', icon: Trash2, badge: 'ANTI-DELETE' },
    { id: 'status', label: 'Status WhatsApp', icon: Sparkles },
    { id: 'media', label: 'Media Center', icon: Image },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'groups', label: 'Groups', icon: MessagesSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'storage', label: 'Storage Manager', icon: HardDrive },
    { id: 'logs', label: 'Activity Logs', icon: FileText },
    { id: 'health', label: 'System Health', icon: Activity },
    { id: 'diagnostics', label: 'Diagnostics / Test', icon: TestTube2 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'privacy', label: 'Privacy & Data', icon: ShieldAlert },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-base shadow-md shadow-emerald-500/20">
              WA
            </div>
            <div>
              <div className="font-bold text-zinc-900 dark:text-white leading-tight">WA Bot Core</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Monitoring & Archive</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Navigation
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-500' : 'text-zinc-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badge === 'AUTO-SAVE'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Local Vault & Encrypted</span>
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Multi-device Session Ready</div>
        </div>
      </aside>
    </>
  );
};
