import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { getAIHelp } from '../../config/gemini';
import { Bot, Send, FileText, Mic, MicOff, Upload, MessageCircle } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  roomId: string;
  fileUrl: string;
}

interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AIRequest {
  id: string;
  studentId: string;
  documentId?: string;
  interactionHistory: ChatMessage[];
  voiceMode: boolean;
  createdAt: Date;
}

const AIHelpTab: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchDocuments();
  }, [userProfile]);

  const fetchDocuments = async () => {
    if (!userProfile?.rooms.length) return;

    try {
      const documentsPromises = userProfile.rooms.map(async (roomId) => {
        const documentsRef = collection(db, 'documents');
        const q = query(documentsRef, where('roomId', '==', roomId));
        const documentsSnapshot = await getDocs(q);
        
        return documentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      });

      const allDocuments = (await Promise.all(documentsPromises)).flat();
      setDocuments(allDocuments as Document[]);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || loading) return;

    const userMessage: ChatMessage = {
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setLoading(true);

    try {
      const context = selectedDocument ? `Document: ${selectedDocument.title}` : undefined;
      const aiResponse = await getAIHelp(currentMessage, context);
      
      const aiMessage: ChatMessage = {
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);

      // Save to Firestore
      if (userProfile) {
        await addDoc(collection(db, 'aiRequests'), {
          studentId: userProfile.id,
          documentId: selectedDocument?.id,
          interactionHistory: [userMessage, aiMessage],
          voiceMode,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error getting AI help:', error);
      const errorMessage: ChatMessage = {
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCurrentMessage(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      alert('Speech recognition is not supported in this browser.');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      // In a real implementation, you'd upload this to Firebase Storage
      // and extract text content for AI processing
    } else {
      alert('Please upload a PDF file.');
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    setSelectedDocument(null);
    setUploadedFile(null);
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Bot className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">AI Study Assistant</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setVoiceMode(!voiceMode)}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
              voiceMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {voiceMode ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
            Voice Mode
          </button>
          
          <button
            onClick={clearChat}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear Chat
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        {/* Document Selection */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Select Document</h3>
            
            <div className="space-y-2 mb-4">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedDocument?.id === doc.id
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium truncate">{doc.title}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or upload a PDF
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                <span className="text-sm text-gray-600">Upload PDF</span>
              </label>
              
              {uploadedFile && (
                <div className="mt-2 text-sm text-green-600">
                  ✓ {uploadedFile.name}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-3 flex flex-col">
          <div className="flex-1 bg-gray-50 rounded-xl p-4 overflow-y-auto">
            {chatMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
                  <p className="text-gray-600">
                    Ask questions about your study materials or upload a document to get AI-powered help.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-3xl p-4 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 border'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.type === 'ai' && (
                          <Bot className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className={`text-xs mt-2 ${
                            message.type === 'user' ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border rounded-lg p-4 max-w-xs">
                      <div className="flex items-center space-x-2">
                        <Bot className="w-5 h-5 text-blue-600" />
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="mt-4 flex space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask a question about your study materials..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              
              {voiceMode && (
                <button
                  onClick={startVoiceRecognition}
                  disabled={isListening}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors ${
                    isListening 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={loading || !currentMessage.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {selectedDocument && (
            <div className="mt-2 text-sm text-gray-600 flex items-center">
              <FileText className="w-4 h-4 mr-1" />
              Context: {selectedDocument.title}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIHelpTab;