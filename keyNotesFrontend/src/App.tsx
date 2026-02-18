import  { useState } from 'react';
import KeyValueForm from './components/KeyValueForm';
import ChatRoom from './components/ChatRoom';
import { Database, MessageCircle } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'storage' | 'chat'>('storage');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 ${
              activeTab === 'storage'
                ? 'bg-white text-purple-900 shadow-lg'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Database className="w-5 h-5" />
            Key-Value Storage
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 ${
              activeTab === 'chat'
                ? 'bg-white text-purple-900 shadow-lg'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            Chat Room
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4">
        {activeTab === 'storage' ? <KeyValueForm /> : <ChatRoom />}
      </div>
    </div>
  );
}

export default App;