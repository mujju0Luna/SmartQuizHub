import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';

interface LeaderboardEntry {
  studentId: string;
  studentName: string;
  score: number;
  submittedAt: Date;
  rank: number;
}

interface QuizLeaderboard {
  quizId: string;
  quizTitle: string;
  roomId: string;
  entries: LeaderboardEntry[];
}

const LeaderboardTab: React.FC = () => {
  const [leaderboards, setLeaderboards] = useState<QuizLeaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchLeaderboards();
  }, [userProfile]);

  const fetchLeaderboards = async () => {
    if (!userProfile?.rooms.length) {
      setLoading(false);
      return;
    }

    try {
      const leaderboardPromises = userProfile.rooms.map(async (roomId) => {
        // Get all quizzes in the room
        const quizzesRef = collection(db, `rooms/${roomId}/quizzes`);
        const quizzesSnapshot = await getDocs(quizzesRef);
        
        return Promise.all(
          quizzesSnapshot.docs.map(async (quizDoc) => {
            const quizData = quizDoc.data();
            
            // Get leaderboard entries for this quiz
            const leaderboardRef = collection(db, `rooms/${roomId}/leaderboard`);
            const leaderboardSnapshot = await getDocs(leaderboardRef);
            
            const entries: LeaderboardEntry[] = leaderboardSnapshot.docs
              .filter(doc => doc.id.startsWith(quizDoc.id))
              .map(doc => ({
                ...doc.data(),
                submittedAt: doc.data().submittedAt.toDate()
              }))
              .sort((a, b) => b.score - a.score)
              .map((entry, index) => ({
                ...entry,
                rank: index + 1
              }));

            return {
              quizId: quizDoc.id,
              quizTitle: quizData.title,
              roomId,
              entries
            };
          })
        );
      });

      const allLeaderboards = (await Promise.all(leaderboardPromises)).flat();
      setLeaderboards(allLeaderboards.filter(lb => lb.entries.length > 0));
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-500" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-200';
      case 2:
        return 'bg-gradient-to-r from-gray-100 to-gray-50 border-gray-200';
      case 3:
        return 'bg-gradient-to-r from-orange-100 to-orange-50 border-orange-200';
      default:
        return 'bg-white border-gray-200';
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
        <TrendingUp className="w-6 h-6 text-blue-600 mr-3" />
        <h2 className="text-2xl font-bold text-gray-900">Leaderboards</h2>
      </div>

      {leaderboards.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No leaderboards available</h3>
          <p className="text-gray-600">Complete quizzes to see rankings</p>
        </div>
      ) : (
        <div className="space-y-8">
          {leaderboards.map((leaderboard) => (
            <div key={`${leaderboard.roomId}-${leaderboard.quizId}`} className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{leaderboard.quizTitle}</h3>
              
              <div className="space-y-3">
                {leaderboard.entries.map((entry, index) => {
                  const isCurrentUser = entry.studentId === userProfile?.id;
                  
                  return (
                    <div
                      key={entry.studentId}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                        getRankColor(entry.rank)
                      } ${
                        isCurrentUser ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        {getRankIcon(entry.rank)}
                        <div>
                          <p className={`font-medium ${isCurrentUser ? 'text-blue-900' : 'text-gray-900'}`}>
                            {entry.studentName} {isCurrentUser && '(You)'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Submitted: {entry.submittedAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{entry.score}%</div>
                        <div className="text-sm text-gray-600">Score</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaderboardTab;