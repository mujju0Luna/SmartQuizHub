import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart3, Users, Trophy, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Quiz {
  id: string;
  roomId: string;
  roomName: string;
  title: string;
  createdAt: Date;
  totalStudents: number;
  submittedCount: number;
  averageScore: number;
  submissions: Submission[];
}

interface Submission {
  studentId: string;
  studentName: string;
  score: number;
  analysis: string;
  submittedAt: Date;
}

const PerformanceTab: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchQuizPerformance();
  }, [userProfile]);

  const fetchQuizPerformance = async () => {
    if (!userProfile) return;

    try {
      // Get faculty rooms
      const roomsRef = collection(db, 'rooms');
      const roomsQuery = query(roomsRef, where('facultyId', '==', userProfile.id));
      const roomsSnapshot = await getDocs(roomsQuery);

      const quizPromises = roomsSnapshot.docs.map(async (roomDoc) => {
        const roomData = roomDoc.data();
        const quizzesRef = collection(db, `rooms/${roomDoc.id}/quizzes`);
        const quizzesSnapshot = await getDocs(quizzesRef);

        return Promise.all(
          quizzesSnapshot.docs.map(async (quizDoc) => {
            const quizData = quizDoc.data();
            
            // Get submissions
            const submissionsRef = collection(db, `rooms/${roomDoc.id}/quizzes/${quizDoc.id}/submissions`);
            const submissionsSnapshot = await getDocs(submissionsRef);
            
            const submissions: Submission[] = await Promise.all(
              submissionsSnapshot.docs.map(async (subDoc) => {
                const subData = subDoc.data();
                
                // Get student name
                const studentRef = collection(db, 'users');
                const studentQuery = query(studentRef, where('__name__', '==', subData.studentId));
                const studentSnapshot = await getDocs(studentQuery);
                const studentName = studentSnapshot.docs[0]?.data()?.name || 'Unknown Student';
                
                return {
                  studentId: subData.studentId,
                  studentName,
                  score: subData.score,
                  analysis: subData.analysis,
                  submittedAt: subData.submittedAt.toDate()
                };
              })
            );

            const averageScore = submissions.length > 0 
              ? submissions.reduce((sum, sub) => sum + sub.score, 0) / submissions.length 
              : 0;

            return {
              id: quizDoc.id,
              roomId: roomDoc.id,
              roomName: roomData.roomName,
              title: quizData.title,
              createdAt: quizData.startDate.toDate(),
              totalStudents: roomData.studentIds.length,
              submittedCount: submissions.length,
              averageScore: Math.round(averageScore),
              submissions
            };
          })
        );
      });

      const allQuizzes = (await Promise.all(quizPromises)).flat();
      setQuizzes(allQuizzes);
    } catch (error) {
      console.error('Error fetching quiz performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAnalysisColor = (analysis: string) => {
    switch (analysis) {
      case 'Good':
        return 'bg-green-100 text-green-800';
      case 'Fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'Needs Improvement':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (viewMode === 'detailed' && selectedQuiz) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => {
                setViewMode('overview');
                setSelectedQuiz(null);
              }}
              className="text-teal-600 hover:text-teal-800 mb-2"
            >
              ← Back to Overview
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{selectedQuiz.title}</h2>
            <p className="text-gray-600">{selectedQuiz.roomName}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Students</p>
                <p className="text-2xl font-bold text-blue-900">{selectedQuiz.totalStudents}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-green-50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Submissions</p>
                <p className="text-2xl font-bold text-green-900">{selectedQuiz.submittedCount}</p>
              </div>
              <Trophy className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Average Score</p>
                <p className="text-2xl font-bold text-purple-900">{selectedQuiz.averageScore}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-orange-50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Participation</p>
                <p className="text-2xl font-bold text-orange-900">
                  {Math.round((selectedQuiz.submittedCount / selectedQuiz.totalStudents) * 100)}%
                </p>
              </div>
              {selectedQuiz.submittedCount / selectedQuiz.totalStudents > 0.8 ? 
                <TrendingUp className="w-8 h-8 text-orange-600" /> : 
                <TrendingDown className="w-8 h-8 text-orange-600" />
              }
            </div>
          </div>
        </div>

        {/* Student Submissions */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Performance</h3>
          
          {selectedQuiz.submissions.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No submissions yet</p>
          ) : (
            <div className="space-y-3">
              {selectedQuiz.submissions
                .sort((a, b) => b.score - a.score)
                .map((submission, index) => (
                  <div key={submission.studentId} className="bg-white rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{submission.studentName}</p>
                        <p className="text-sm text-gray-600">
                          Submitted: {format(submission.submittedAt, 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAnalysisColor(submission.analysis)}`}>
                        {submission.analysis}
                      </span>
                      <span className={`text-lg font-bold ${getScoreColor(submission.score)}`}>
                        {submission.score}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <BarChart3 className="w-6 h-6 text-teal-600 mr-3" />
        <h2 className="text-2xl font-bold text-gray-900">Performance Tracking</h2>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes created yet</h3>
          <p className="text-gray-600">Create your first quiz to see performance analytics</p>
        </div>
      ) : (
        <div className="space-y-6">
          {quizzes.map((quiz) => (
            <div key={`${quiz.roomId}-${quiz.id}`} className="bg-gray-50 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{quiz.title}</h3>
                  <p className="text-gray-600 mb-2">{quiz.roomName}</p>
                  <p className="text-sm text-gray-500">Created: {format(quiz.createdAt, 'MMM dd, yyyy')}</p>
                </div>
                
                <button
                  onClick={() => {
                    setSelectedQuiz(quiz);
                    setViewMode('detailed');
                  }}
                  className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{quiz.totalStudents}</p>
                  <p className="text-sm text-gray-600">Total Students</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{quiz.submittedCount}</p>
                  <p className="text-sm text-gray-600">Submissions</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className={`text-2xl font-bold ${getScoreColor(quiz.averageScore)}`}>
                    {quiz.averageScore}%
                  </p>
                  <p className="text-sm text-gray-600">Average Score</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round((quiz.submittedCount / quiz.totalStudents) * 100)}%
                  </p>
                  <p className="text-sm text-gray-600">Participation</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PerformanceTab;