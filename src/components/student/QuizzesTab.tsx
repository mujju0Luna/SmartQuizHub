import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, Calendar, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { format, isPast, isAfter, isBefore } from 'date-fns';

interface Quiz {
  id: string;
  roomId: string;
  title: string;
  documentId: string;
  numberOfQuestions: number;
  startDate: Date;
  endDate: Date;
  durationMinutes: number;
  createdBy: string;
  status: 'upcoming' | 'active' | 'ended';
  submitted?: boolean;
  score?: number;
  analysis?: string;
}

interface Question {
  questionText: string;
  options: string[];
  correctOption: number;
  explanation: string;
}

const QuizzesTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('all');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const { userProfile } = useAuth();

  const subTabs = [
    { id: 'all', label: 'All Quizzes' },
    { id: 'assignments', label: 'Assignments (Pending)' },
    { id: 'submitted', label: 'Submitted' }
  ];

  useEffect(() => {
    fetchQuizzes();
  }, [userProfile]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (quizStarted && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [quizStarted, timeLeft]);

  const fetchQuizzes = async () => {
    if (!userProfile?.rooms.length) {
      setLoading(false);
      return;
    }

    try {
      const quizPromises = userProfile.rooms.map(async (roomId) => {
        const quizzesRef = collection(db, `rooms/${roomId}/quizzes`);
        const quizzesSnapshot = await getDocs(quizzesRef);
        
        return Promise.all(
          quizzesSnapshot.docs.map(async (quizDoc) => {
            const quizData = quizDoc.data();
            const submissionRef = doc(db, `rooms/${roomId}/quizzes/${quizDoc.id}/submissions/${userProfile.id}`);
            const submissionDoc = await getDoc(submissionRef);
            
            const now = new Date();
            const startDate = quizData.startDate.toDate();
            const endDate = quizData.endDate.toDate();
            
            let status: 'upcoming' | 'active' | 'ended' = 'upcoming';
            if (isPast(endDate)) status = 'ended';
            else if (isAfter(now, startDate) && isBefore(now, endDate)) status = 'active';
            
            return {
              id: quizDoc.id,
              roomId,
              ...quizData,
              startDate,
              endDate,
              status,
              submitted: submissionDoc.exists(),
              score: submissionDoc.data()?.score,
              analysis: submissionDoc.data()?.analysis
            };
          })
        );
      });

      const allQuizzes = (await Promise.all(quizPromises)).flat();
      setQuizzes(allQuizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredQuizzes = () => {
    switch (activeSubTab) {
      case 'assignments':
        return quizzes
          .filter(quiz => quiz.status === 'active' && !quiz.submitted)
          .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
      case 'submitted':
        return quizzes.filter(quiz => quiz.submitted);
      default:
        return quizzes;
    }
  };

  const startQuiz = async (quiz: Quiz) => {
    try {
      const questionsRef = collection(db, `rooms/${quiz.roomId}/quizzes/${quiz.id}/questions`);
      const questionsSnapshot = await getDocs(questionsRef);
      const questions = questionsSnapshot.docs.map(doc => doc.data() as Question);
      
      setSelectedQuiz(quiz);
      setQuizQuestions(questions);
      setAnswers(new Array(questions.length).fill(-1));
      setCurrentQuestionIndex(0);
      setQuizStarted(true);
      setTimeLeft(quiz.durationMinutes * 60);
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const calculateScore = () => {
    let correct = 0;
    quizQuestions.forEach((question, index) => {
      if (answers[index] === question.correctOption) {
        correct++;
      }
    });
    return Math.round((correct / quizQuestions.length) * 100);
  };

  const getAnalysis = (score: number) => {
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  const handleSubmitQuiz = async () => {
    if (!selectedQuiz || !userProfile) return;

    const score = calculateScore();
    const analysis = getAnalysis(score);

    try {
      const submissionRef = doc(
        db,
        `rooms/${selectedQuiz.roomId}/quizzes/${selectedQuiz.id}/submissions/${userProfile.id}`
      );
      
      await setDoc(submissionRef, {
        studentId: userProfile.id,
        answers,
        score,
        analysis,
        submittedAt: new Date()
      });

      // Update leaderboard
      const leaderboardRef = doc(
        db,
        `rooms/${selectedQuiz.roomId}/leaderboard/${selectedQuiz.id}`
      );
      
      await setDoc(leaderboardRef, {
        studentId: userProfile.id,
        studentName: userProfile.name,
        score,
        submittedAt: new Date()
      });

      setSelectedQuiz(null);
      setQuizStarted(false);
      setQuizQuestions([]);
      setAnswers([]);
      fetchQuizzes();
      
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (quizStarted && selectedQuiz) {
    const currentQuestion = quizQuestions[currentQuestionIndex];
    
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{selectedQuiz.title}</h2>
            <p className="text-gray-600">Question {currentQuestionIndex + 1} of {quizQuestions.length}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-red-600">
              <Clock className="w-5 h-5 mr-2" />
              <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{currentQuestion.questionText}</h3>
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  answers[currentQuestionIndex] === index
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex space-x-3">
            {currentQuestionIndex < quizQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Submit Quiz
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Quizzes</h2>
      </div>

      {/* Sub-tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              activeSubTab === tab.id
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quiz List */}
      <div className="space-y-4">
        {getFilteredQuizzes().map((quiz) => (
          <div
            key={`${quiz.roomId}-${quiz.id}`}
            className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{quiz.title}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {format(quiz.startDate, 'MMM dd, yyyy')} - {format(quiz.endDate, 'MMM dd, yyyy')}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {quiz.durationMinutes} minutes
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  quiz.status === 'active' ? 'bg-green-100 text-green-800' :
                  quiz.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {quiz.status}
                </span>
                
                {quiz.submitted && (
                  <div className="text-right">
                    <div className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Score: {quiz.score}%
                    </div>
                    <div className="text-xs text-gray-600">{quiz.analysis}</div>
                  </div>
                )}
                
                {quiz.status === 'active' && !quiz.submitted && (
                  <button
                    onClick={() => startQuiz(quiz)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Quiz
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {getFilteredQuizzes().length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes found</h3>
            <p className="text-gray-600">
              {activeSubTab === 'all' ? 'Join rooms to see available quizzes' :
               activeSubTab === 'assignments' ? 'No pending assignments' :
               'No submitted quizzes yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizzesTab;