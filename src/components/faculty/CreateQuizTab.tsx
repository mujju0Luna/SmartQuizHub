import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { generateQuizQuestions } from '../../config/gemini';
import { Plus, Upload, Calendar, Clock, Hash, Users, FileText } from 'lucide-react';

interface Room {
  id: string;
  roomName: string;
  studentIds: string[];
}

const CreateQuizTab: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    selectedRoom: '',
    numberOfQuestions: 10,
    startDate: '',
    endDate: '',
    durationMinutes: 60
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);
  
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchRooms();
  }, [userProfile]);

  const fetchRooms = async () => {
    if (!userProfile) return;

    try {
      const roomsRef = collection(db, 'rooms');
      const q = query(roomsRef, where('facultyId', '==', userProfile.id));
      const roomsSnapshot = await getDocs(q);
      
      const roomsData = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRooms(roomsData as Room[]);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const createRoom = async () => {
    if (!newRoomName.trim() || !userProfile) return;

    setCreatingRoom(true);
    try {
      const roomData = {
        roomName: newRoomName,
        facultyId: userProfile.id,
        studentIds: [],
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'rooms'), roomData);
      
      // Update faculty's rooms list
      // Note: In the provided schema, users have rooms[] but faculty wouldn't typically be in rooms
      // This is just to keep the room reference for the faculty
      
      setRooms(prev => [...prev, { id: docRef.id, ...roomData }]);
      setNewRoomName('');
      setShowCreateRoom(false);
      
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        setUploadedFile(file);
      } else {
        alert('Please upload a PDF or DOC file.');
      }
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    // This is a simplified version. In a real implementation, you'd use libraries like:
    // - pdf-parse for PDFs
    // - mammoth for .docx files
    // For now, we'll return placeholder text
    return `This is sample text extracted from ${file.name}. In a real implementation, you would extract the actual text content from the uploaded document.`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile || !formData.selectedRoom || !userProfile) return;

    setLoading(true);
    try {
      // Upload file to Firebase Storage
      const fileRef = ref(storage, `documents/${Date.now()}_${uploadedFile.name}`);
      await uploadBytes(fileRef, uploadedFile);
      const fileUrl = await getDownloadURL(fileRef);

      // Create document record
      const documentRef = await addDoc(collection(db, 'documents'), {
        title: formData.title || uploadedFile.name,
        uploadedBy: userProfile.id,
        roomId: formData.selectedRoom,
        fileUrl,
        createdAt: new Date()
      });

      // Extract text and generate questions
      const documentText = await extractTextFromFile(uploadedFile);
      const questions = await generateQuizQuestions(documentText, formData.numberOfQuestions);

      // Create quiz
      const quizRef = await addDoc(collection(db, `rooms/${formData.selectedRoom}/quizzes`), {
        title: formData.title,
        documentId: documentRef.id,
        numberOfQuestions: formData.numberOfQuestions,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        durationMinutes: formData.durationMinutes,
        createdBy: userProfile.id,
        status: 'created'
      });

      // Save questions
      const questionPromises = questions.map((question: any, index: number) =>
        setDoc(doc(db, `rooms/${formData.selectedRoom}/quizzes/${quizRef.id}/questions/${index}`), question)
      );
      await Promise.all(questionPromises);

      // Update document with quiz link
      await setDoc(doc(db, 'documents', documentRef.id), {
        title: formData.title || uploadedFile.name,
        uploadedBy: userProfile.id,
        roomId: formData.selectedRoom,
        fileUrl,
        quizLinked: quizRef.id,
        createdAt: new Date()
      });

      alert('Quiz created successfully!');
      
      // Reset form
      setFormData({
        title: '',
        selectedRoom: '',
        numberOfQuestions: 10,
        startDate: '',
        endDate: '',
        durationMinutes: 60
      });
      setUploadedFile(null);

    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('Failed to create quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Plus className="w-6 h-6 text-teal-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Create Quiz</h2>
        </div>
        
        {rooms.length === 0 && (
          <button
            onClick={() => setShowCreateRoom(true)}
            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Room
          </button>
        )}
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Create your first room</h3>
          <p className="text-gray-600 mb-4">You need to create a room before you can create quizzes</p>
          <button
            onClick={() => setShowCreateRoom(true)}
            className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Room
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Enter quiz title"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Room *
              </label>
              <div className="flex space-x-2">
                <select
                  value={formData.selectedRoom}
                  onChange={(e) => setFormData(prev => ({ ...prev, selectedRoom: e.target.value }))}
                  required
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                >
                  <option value="">Select a room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.roomName} ({room.studentIds.length} students)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCreateRoom(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Document *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="document-upload"
                  required
                />
                <label htmlFor="document-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">
                    {uploadedFile ? uploadedFile.name : 'Click to upload PDF or DOC file'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Maximum file size: 10MB</p>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Questions *
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={formData.numberOfQuestions}
                onChange={(e) => setFormData(prev => ({ ...prev, numberOfQuestions: parseInt(e.target.value) }))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes) *
              </label>
              <input
                type="number"
                min="10"
                max="180"
                value={formData.durationMinutes}
                onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) }))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date & Time *
              </label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  title: '',
                  selectedRoom: '',
                  numberOfQuestions: 10,
                  startDate: '',
                  endDate: '',
                  durationMinutes: 60
                });
                setUploadedFile(null);
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating Quiz...' : 'Create Quiz'}
            </button>
          </div>
        </form>
      )}

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Room</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Name
              </label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Enter room name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-600 mt-1">
                Students will use the room ID to join
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCreateRoom(false);
                  setNewRoomName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={creatingRoom}
              >
                Cancel
              </button>
              <button
                onClick={createRoom}
                disabled={!newRoomName.trim() || creatingRoom}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creatingRoom ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateQuizTab;