import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUpIcon, 
  PhoneIcon, 
  XCircleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  UserIcon,
  CogIcon
} from '@heroicons/react/24/outline';

const ChatInterface = ({ conversation, messages, onSendMessage, onToggleAI, aiEnabled, status }) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      onSendMessage(inputMessage);
      setInputMessage('');
    }
  };

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

  const getStatusText = (status) => {
    switch (status) {
      case 'new': return 'New Lead';
      case 'contacted': return 'Contacted';
      case 'qualified': return 'Qualified';
      case 'booked': return 'Booked';
      case 'closed_lost': return 'Closed Lost';
      default: return status;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <UserIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">{conversation?.lead_name || 'Unknown Lead'}</h3>
              <p className="text-sm text-blue-100">
                {conversation?.phone || 'No phone'} • 
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getStatusColor(conversation?.lead_status)}`}>
                  {getStatusText(conversation?.lead_status)}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onToggleAI()}
              className={`p-2 rounded-lg transition-colors ${
                aiEnabled 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-yellow-500 text-white hover:bg-yellow-600'
              }`}
              title={aiEnabled ? 'AI Enabled' : 'AI Disabled'}
            >
              <CogIcon className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors">
              <PhoneIcon className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors">
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages?.length > 0 ? (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender_type === 'lead' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  message.sender_type === 'lead'
                    ? 'bg-white text-gray-800 rounded-tl-none shadow-sm'
                    : message.sender_type === 'ai'
                    ? 'bg-blue-100 text-blue-800 rounded-tr-none'
                    : 'bg-indigo-100 text-indigo-800 rounded-tr-none'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {message.sender_type === 'lead' && (
                    <UserIcon className="h-4 w-4 text-gray-500" />
                  )}
                  {message.sender_type === 'ai' && (
                    <div className="h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">AI</span>
                    </div>
                  )}
                  {message.sender_type === 'business' && (
                    <div className="h-4 w-4 bg-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">ME</span>
                    </div>
                  )}
                  <span className="text-xs font-medium capitalize">
                    {message.sender_type === 'lead' ? 'Customer' : 
                     message.sender_type === 'ai' ? 'AI Assistant' : 'You'}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <UserIcon className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start a conversation with this lead</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {conversation?.typing_indicator && (
        <div className="px-4 py-2 bg-blue-50 flex items-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="ml-2 text-sm text-blue-600">AI is typing...</span>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!aiEnabled && inputMessage === ''}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className={`p-1 rounded-full ${
                  inputMessage.trim()
                    ? 'text-blue-500 hover:text-blue-600'
                    : 'text-gray-400'
                }`}
              >
                <ArrowUpIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </form>
        
        {!aiEnabled && (
          <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded-lg flex items-center">
            <ClockIcon className="h-4 w-4 mr-1" />
            <span>AI is currently disabled. You are responding manually.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
