import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ChatInterface from '../components/ChatInterface';
import { 
  UserGroupIcon, 
  PhoneIcon, 
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function Conversations() {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock data - in real app, fetch from API
  useEffect(() => {
    const mockConversations = [
      { 
        id: 1, 
        lead_name: 'John Smith', 
        lead_phone: '(555) 123-4567', 
        lead_status: 'booked', 
        last_message: 'Great, see you tomorrow!', 
        last_updated: '2023-06-15T10:30:00Z',
        unread_count: 0,
        typing_indicator: false
      },
      { 
        id: 2, 
        lead_name: 'Sarah Johnson', 
        lead_phone: '(555) 987-6543', 
        lead_status: 'qualified', 
        last_message: 'What time works for you?', 
        last_updated: '2023-06-15T09:15:00Z',
        unread_count: 2,
        typing_indicator: false
      },
      { 
        id: 3, 
        lead_name: 'Mike Davis', 
        lead_phone: '(555) 456-7890', 
        lead_status: 'contacted', 
        last_message: 'Still considering our offer...', 
        last_updated: '2023-06-15T08:45:00Z',
        unread_count: 0,
        typing_indicator: true
      },
      { 
        id: 4, 
        lead_name: 'Emily Wilson', 
        lead_phone: '(555) 234-5678', 
        lead_status: 'new', 
        last_message: 'Just reached out about dental cleaning', 
        last_updated: '2023-06-15T07:20:00Z',
        unread_count: 1,
        typing_indicator: false
      },
      { 
        id: 5, 
        lead_name: 'Robert Brown', 
        lead_phone: '(555) 876-5432', 
        lead_status: 'booked', 
        last_message: 'Confirmed appointment for next week', 
        last_updated: '2023-06-14T16:30:00Z',
        unread_count: 0,
        typing_indicator: false
      }
    ];

    setConversations(mockConversations);
    if (mockConversations.length > 0) {
      setSelectedConversation(mockConversations[0]);
    }
  }, []);

  // Simulate fetching messages for selected conversation
  useEffect(() => {
    if (selectedConversation) {
      const mockMessages = [
        {
          id: 1,
          conversation_id: selectedConversation.id,
          sender_type: 'lead',
          content: 'Hi, I\'m interested in getting a dental cleaning.',
          created_at: '2023-06-15T10:00:00Z'
        },
        {
          id: 2,
          conversation_id: selectedConversation.id,
          sender_type: 'ai',
          content: 'Hi John! Great to hear from you. How soon would you like to schedule?',
          created_at: '2023-06-15T10:02:00Z'
        },
        {
          id: 3,
          conversation_id: selectedConversation.id,
          sender_type: 'lead',
          content: 'Probably within the next 2 weeks.',
          created_at: '2023-06-15T10:05:00Z'
        },
        {
          id: 4,
          conversation_id: selectedConversation.id,
          sender_type: 'ai',
          content: 'Perfect! We have availability next Tuesday at 10 AM or Thursday at 2 PM. Which works better for you?',
          created_at: '2023-06-15T10:07:00Z'
        },
        {
          id: 5,
          conversation_id: selectedConversation.id,
          sender_type: 'lead',
          content: 'Tuesday at 10 AM works great!',
          created_at: '2023-06-15T10:30:00Z'
        }
      ];
      setMessages(mockMessages);
    }
  }, [selectedConversation]);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleSendMessage = async (message) => {
    if (!selectedConversation || !message.trim()) return;

    // Add the new message to the conversation
    const newMessage = {
      id: Date.now(),
      conversation_id: selectedConversation.id,
      sender_type: 'business',
      content: message,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMessage]);

    // Simulate AI response after a delay
    if (aiEnabled) {
      setTimeout(() => {
        const aiResponse = {
          id: Date.now() + 1,
          conversation_id: selectedConversation.id,
          sender_type: 'ai',
          content: 'Thanks for your message. I\'ll make sure to pass this along to our team.',
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 2000);
    }
  };

  const handleToggleAI = () => {
    setAiEnabled(!aiEnabled);
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.lead_phone.includes(searchTerm);
    const matchesFilter = filterStatus === 'all' || conv.lead_status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800';
      case 'qualified':
        return 'bg-purple-100 text-purple-800';
      case 'booked':
        return 'bg-green-100 text-green-800';
      case 'closed_lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="h-full flex">
      {/* Conversations List */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 flex items-center">
            <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
            Conversations
          </h1>
          
          {/* Search and Filter */}
          <div className="mt-4 space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search conversations..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full py-2 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="booked">Booked</option>
              <option value="closed_lost">Lost</option>
            </select>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => handleSelectConversation(conversation)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedConversation?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {conversation.lead_name}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(conversation.lead_status)}`}>
                      {conversation.lead_status.charAt(0).toUpperCase() + conversation.lead_status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{conversation.lead_phone}</p>
                  <p className="text-sm text-gray-900 truncate mt-1">{conversation.last_message}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <p className="text-xs text-gray-500">{formatTime(conversation.last_updated)}</p>
                  {conversation.unread_count > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ChatInterface
            conversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
            onToggleAI={handleToggleAI}
            aiEnabled={aiEnabled}
            status={selectedConversation.lead_status}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No conversation selected</h3>
              <p className="text-gray-500">Choose a conversation from the list to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
