import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { WhatsAppConnectionPage } from './pages/WhatsAppConnectionPage';
import { ChatsPage } from './pages/ChatsPage';
import { ViewOncePage } from './pages/ViewOncePage';
import { DeletedMessagesPage } from './pages/DeletedMessagesPage';
import { StatusPage } from './pages/StatusPage';
import { MediaPage } from './pages/MediaPage';
import { ContactsPage } from './pages/ContactsPage';
import { GroupsPage } from './pages/GroupsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { StoragePage } from './pages/StoragePage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-white">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
          <span>Memuat sesi aplikasi...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleOpenChat = (_jid: string, _name?: string) => {
    setActiveTab('chats');
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveTab} />;
      case 'connection':
        return <WhatsAppConnectionPage />;
      case 'chats':
        return <ChatsPage />;
      case 'view_once':
        return <ViewOncePage />;
      case 'deleted_messages':
        return <DeletedMessagesPage onNavigateToChat={handleOpenChat} />;
      case 'status':
        return <StatusPage />;
      case 'media':
        return <MediaPage />;
      case 'contacts':
        return <ContactsPage onOpenChat={handleOpenChat} />;
      case 'groups':
        return <GroupsPage onOpenChat={handleOpenChat} />;
      case 'notifications':
        return <NotificationsPage />;
      case 'storage':
        return <StoragePage />;
      case 'logs':
        return <ActivityLogsPage />;
      case 'health':
        return <SystemHealthPage />;
      case 'diagnostics':
        return <DiagnosticsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'privacy':
        return <PrivacyPage />;
      default:
        return <DashboardPage onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex transition-colors">
      {/* Sidebar navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNavigate={setActiveTab}
          activeTab={activeTab}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}
