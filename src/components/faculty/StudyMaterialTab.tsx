import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, FileText, Download, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Room {
  id: string;
  roomName: string;
  studentIds: string[];
}

interface StudyMaterial {
  id: string;
  title: string;
  uploadedBy: string;
  roomId: string;
  roomName: string;
  fileUrl: string;
  createdAt: Date;
  fileSize?: number;
  fileType?: string;
}

const StudyMaterialTab: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    selectedRoom: '',
    file: null as File | null
  });

  const { userProfile } = useAuth();

  useEffect(() => {
    fetchRooms();
    fetchStudyMaterials();
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

  const fetchStudyMaterials = async () => {
    if (!userProfile) return;

    try {
      const documentsRef = collection(db, 'documents');
      const q = query(documentsRef, where('uploadedBy', '==', userProfile.id));
      const documentsSnapshot = await getDocs(q);
      
      const materialsPromises = documentsSnapshot.docs.map(async (doc) => {
        const docData = doc.data();
        
        // Get room name
        const roomDoc = await getDocs(query(collection(db, 'rooms'), where('__name__', '==', docData.roomId)));
        const roomName = roomDoc.docs[0]?.data()?.roomName || 'Unknown Room';
        
        return {
          id: doc.id,
          ...docData,
          roomName,
          createdAt: docData.createdAt.toDate()
        };
      });
      
      const materials = await Promise.all(materialsPromises);
      setStudyMaterials(materials as StudyMaterial[]);
    } catch (error) {
      console.error('Error fetching study materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadForm(prev => ({ ...prev, file }));
      if (!uploadForm.title) {
        setUploadForm(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.selectedRoom || !userProfile) return;

    setUploading(true);
    try {
      // Upload file to Firebase Storage
      const fileRef = ref(storage, `study-materials/${Date.now()}_${uploadForm.file.name}`);
      await uploadBytes(fileRef, uploadForm.file);
      const fileUrl = await getDownloadURL(fileRef);

      // Create document record (without quiz link)
      await addDoc(collection(db, 'documents'), {
        title: uploadForm.title,
        uploadedBy: userProfile.id,
        roomId: uploadForm.selectedRoom,
        fileUrl,
        fileSize: uploadForm.file.size,
        fileType: uploadForm.file.type,
        createdAt: new Date()
      });

      // Reset form and close modal
      setUploadForm({ title: '', selectedRoom: '', file: null });
      setShowUploadModal(false);
      
      // Refresh materials list
      fetchStudyMaterials();
      
      alert('Study material uploaded successfully!');
    } catch (error) {
      console.error('Error uploading study material:', error);
      alert('Failed to upload study material. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType?: string) => {
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('word') || fileType?.includes('doc')) return '📝';
    if (fileType?.includes('image')) return '🖼️';
    if (fileType?.includes('video')) return '🎥';
    return '📄';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Upload className="w-6 h-6 text-teal-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Study Materials</h2>
        </div>
        
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Material
        </button>
      </div>

      {studyMaterials.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No study materials uploaded</h3>
          <p className="text-gray-600 mb-4">Upload documents, PDFs, or other study materials for your students</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload First Material
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studyMaterials.map((material) => (
            <div key={material.id} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{getFileIcon(material.fileType)}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{material.title}</h3>
                    <p className="text-sm text-gray-600">{material.roomName}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {format(material.createdAt, 'MMM dd, yyyy')}
                </div>
                {material.fileSize && (
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    {formatFileSize(material.fileSize)}
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <button
                  onClick={() => window.open(material.fileUrl, '_blank')}
                  className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </button>
                
                <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Study Material</h3>
            
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter material title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room *
                </label>
                <select
                  value={uploadForm.selectedRoom}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, selectedRoom: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                >
                  <option value="">Select a room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.roomName} ({room.studentIds.length} students)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File *
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                {uploadForm.file && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                  </p>
                )}
              </div>
            </form>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm({ title: '', selectedRoom: '', file: null });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadForm.file || !uploadForm.selectedRoom || !uploadForm.title || uploading}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyMaterialTab;