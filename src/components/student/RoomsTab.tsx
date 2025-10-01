import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, arrayUnion, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Plus, Hash, Calendar, User, UserPlus } from 'lucide-react';
import { format } from 'date-fns';

interface Room {
  id: string;
  roomName: string;
  facultyId: string;
  facultyName?: string;
  studentIds: string[];
  createdAt: Date;
}

const RoomsTab: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchRooms();
  }, [userProfile]);

  const fetchRooms = async () => {
    if (!userProfile?.rooms.length) {
      setLoading(false);
      return;
    }

    try {
      const roomPromises = userProfile.rooms.map(async (roomId) => {
        const roomDoc = await getDoc(doc(db, 'rooms', roomId));
        if (roomDoc.exists()) {
          const roomData = roomDoc.data();
          
          // Get faculty name
          const facultyDoc = await getDoc(doc(db, 'users', roomData.facultyId));
          const facultyName = facultyDoc.exists() ? facultyDoc.data().name : 'Unknown Faculty';
          
          return {
            id: roomDoc.id,
            ...roomData,
            facultyName,
            createdAt: roomData.createdAt.toDate()
          };
        }
        return null;
      });

      const roomsData = (await Promise.all(roomPromises)).filter(Boolean);
      setRooms(roomsData as Room[]);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!roomCode.trim() || !userProfile) return;

    setJoiningRoom(true);
    try {
      // Find room by ID (room code)
      const roomDoc = await getDoc(doc(db, 'rooms', roomCode));
      
      if (!roomDoc.exists()) {
        alert('Room not found. Please check the room code.');
        return;
      }

      const roomData = roomDoc.data();
      
      // Check if already joined
      if (roomData.studentIds.includes(userProfile.id)) {
        alert('You are already a member of this room.');
        return;
      }

      // Add student to room
      await updateDoc(doc(db, 'rooms', roomCode), {
        studentIds: arrayUnion(userProfile.id)
      });

      // Add room to user's rooms list
      await updateDoc(doc(db, 'users', userProfile.id), {
        rooms: arrayUnion(roomCode)
      });

      setShowJoinModal(false);
      setRoomCode('');
      fetchRooms();
      
      // Update user profile in context (optional - will be updated on next page load)
      
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room. Please try again.');
    } finally {
      setJoiningRoom(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Users className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">My Rooms</h2>
        </div>
        
        <button
          onClick={() => setShowJoinModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Join Room
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms joined</h3>
          <p className="text-gray-600 mb-4">Join a room to access quizzes and study materials</p>
          <button
            onClick={() => setShowJoinModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Join Your First Room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl p-6 border border-blue-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{room.roomName}</h3>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <User className="w-4 h-4 mr-1" />
                    {room.facultyName}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <Calendar className="w-4 h-4 mr-1" />
                    Joined: {format(room.createdAt, 'MMM dd, yyyy')}
                  </div>
                </div>
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-blue-200">
                <div className="flex items-center text-sm text-gray-600">
                  <Hash className="w-4 h-4 mr-1" />
                  <span className="font-mono">{room.id}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <UserPlus className="w-4 h-4 mr-1" />
                  {room.studentIds.length} students
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Join a Room</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Enter room code"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-600 mt-1">
                Get the room code from your faculty member
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setRoomCode('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={joiningRoom}
              >
                Cancel
              </button>
              <button
                onClick={joinRoom}
                disabled={!roomCode.trim() || joiningRoom}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {joiningRoom ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomsTab;