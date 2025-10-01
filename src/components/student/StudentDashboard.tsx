import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Trophy, FileText, Bot, Users, LogOut } from 'lucide-react';
import QuizzesTab from './QuizzesTab';
import LeaderboardTab from './LeaderboardTab';
import DocumentsTab from './DocumentsTab';
import AIHelpTab from './AIHelpTab';
import RoomsTab from './RoomsTab';

const StudentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('quizzes');
  const { userProfile, logout } = useAuth();

  const tabs = [
    { id: 'quizzes', label: 'Quizzes', icon: BookOpen },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'ai-help', label: 'AI Help', icon: Bot },
    { id: 'rooms', label: 'Rooms', icon: Users }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'quizzes':
        return <QuizzesTab />;
      case 'leaderboard':
        return <LeaderboardTab />;
      case 'documents':
        return <DocumentsTab />;
      case 'ai-help':
        return <AIHelpTab />;
      case 'rooms':
        return <RoomsTab />;
      default:
        return <QuizzesTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Student Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {userProfile?.name}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="bg-white rounded-xl shadow-sm border p-4">
              <ul className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-all ${
                          activeTab === tab.id
                            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {tab.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border min-h-[600px]">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;