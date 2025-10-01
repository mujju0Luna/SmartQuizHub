import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Download, Lock, Unlock, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Document {
  id: string;
  title: string;
  uploadedBy: string;
  roomId: string;
  fileUrl: string;
  quizLinked?: string;
  createdAt: Date;
  unlocked: boolean;
  quizEndDate?: Date;
}

const DocumentsTab: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchDocuments();
  }, [userProfile]);

  const fetchDocuments = async () => {
    if (!userProfile?.rooms.length) {
      setLoading(false);
      return;
    }

    try {
      const documentsPromises = userProfile.rooms.map(async (roomId) => {
        const documentsRef = collection(db, 'documents');
        const q = query(documentsRef, where('roomId', '==', roomId));
        const documentsSnapshot = await getDocs(q);
        
        return Promise.all(
          documentsSnapshot.docs.map(async (docSnapshot) => {
            const docData = docSnapshot.data();
            let unlocked = true;
            let quizEndDate: Date | undefined;

            // If document is linked to a quiz, check if quiz has ended
            if (docData.quizLinked) {
              const quizRef = collection(db, `rooms/${roomId}/quizzes`);
              const quizSnapshot = await getDocs(quizRef);
              const linkedQuiz = quizSnapshot.docs.find(quiz => quiz.id === docData.quizLinked);
              
              if (linkedQuiz) {
                quizEndDate = linkedQuiz.data().endDate.toDate();
                unlocked = new Date() > quizEndDate;
              }
            }

            return {
              id: docSnapshot.id,
              ...docData,
              createdAt: docData.createdAt.toDate(),
              unlocked,
              quizEndDate
            };
          })
        );
      });

      const allDocuments = (await Promise.all(documentsPromises)).flat();
      setDocuments(allDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (document: Document) => {
    if (document.unlocked) {
      window.open(document.fileUrl, '_blank');
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
      <div className="flex items-center mb-6">
        <FileText className="w-6 h-6 text-blue-600 mr-3" />
        <h2 className="text-2xl font-bold text-gray-900">Study Materials</h2>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents available</h3>
          <p className="text-gray-600">Your faculty will upload study materials here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((document) => (
            <div
              key={document.id}
              className={`bg-gray-50 rounded-xl p-6 border-2 transition-all ${
                document.unlocked 
                  ? 'hover:shadow-md hover:border-blue-200 cursor-pointer' 
                  : 'opacity-75 cursor-not-allowed'
              }`}
              onClick={() => handleDownload(document)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <FileText className={`w-5 h-5 mr-2 ${document.unlocked ? 'text-blue-600' : 'text-gray-400'}`} />
                    {document.unlocked ? (
                      <Unlock className="w-4 h-4 text-green-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{document.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Uploaded: {format(document.createdAt, 'MMM dd, yyyy')}
                  </p>
                  
                  {document.quizEndDate && !document.unlocked && (
                    <div className="flex items-center text-sm text-orange-600 mb-2">
                      <Calendar className="w-4 h-4 mr-1" />
                      Unlocks: {format(document.quizEndDate, 'MMM dd, yyyy')}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  document.unlocked 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {document.unlocked ? 'Available' : 'Locked'}
                </span>
                
                {document.unlocked && (
                  <button className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                    <Download className="w-4 h-4 mr-1" />
                    Open
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentsTab;