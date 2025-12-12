import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { getCompletedCases } from '../../services/firestoreService';
import { CompletedCase } from '../../services/firestoreService';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { formatDate } from '../../utils/dateHelpers';

// Helper function to get dynamic Tailwind CSS classes based on diagnostic correctness.
const getCorrectnessColor = (correctness: string) => {
  switch (correctness) {
    case 'Correct': return 'bg-green-100 text-green-800';
    case 'Partially Correct': return 'bg-yellow-100 text-yellow-800';
    case 'Incorrect': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Helper function to get dynamic Tailwind CSS classes based on case rarity.
const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'Very Common': return 'bg-green-100 text-green-800';
    case 'Common': return 'bg-blue-100 text-blue-800';
    case 'Uncommon': return 'bg-yellow-100 text-yellow-800';
    case 'Rare': return 'bg-orange-100 text-orange-800';
    case 'Very Rare': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getCorrectnessIcon = (correctness: string) => {
  switch (correctness) {
    case 'Correct':
      return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>;
    case 'Partially Correct':
      return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>;
    case 'Incorrect':
      return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>;
    default:
      return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>;
  }
};

const confidenceColor = (confidence: number) => {
  if (confidence >= 80) return 'text-green-600';
  if (confidence >= 50) return 'text-yellow-600';
  return 'text-red-600';
};

export const PastCasesScreen: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<CompletedCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const fetchCases = async () => {
        try {
          setIsLoading(true);
          // Check if Firebase is properly initialized before attempting to fetch cases
          const { isFirebaseReady } = await import('../../services/firebase');
          if (!isFirebaseReady()) {
            throw new Error('Firebase is not properly initialized. Please check your configuration.');
          }
          const userCases = await getCompletedCases(user.uid);
          setCases(userCases);
        } catch (err) {
          console.error('Error fetching completed cases:', err);
          setError('Failed to load your past cases. Please try again later.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchCases();
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleCaseSelect = (caseId: string) => {
    navigate(`/case/${caseId}`);
  };

  const handleViewCase = (caseId: string) => {
    navigate(`/past-cases/${caseId}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-plexus-bg-secondary flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-plexus-bg-secondary flex flex-col items-center justify-center p-4">
        <Spinner size="lg" className="text-plexus-blue" />
        <p className="mt-4 text-lg text-gray-600">Loading your past cases...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-plexus-bg-secondary flex flex-col items-center justify-center p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg max-w-md text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-plexus-bg-secondary p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-plexus-blue hover:text-plexus-blue-dark transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Home
            </button>
          </div>
          <h1 className="text-4xl font-bold text-plexus-blue">Past Diagnoses</h1>
          <p className="text-lg text-gray-600 mt-2">
            Review your completed cases and performance
          </p>
          <div className="mt-4 flex justify-center">
            <span className="inline-block bg-plexus-accent/10 text-plexus-accent font-semibold px-4 py-2 rounded-full">
              {cases.length} {cases.length === 1 ? 'case' : 'cases'} completed
            </span>
          </div>
        </header>

        {cases.length === 0 ? (
          <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mt-4">No completed cases yet</h3>
            <p className="text-gray-500 mt-2 mb-6">Start your first case to see it appear here</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-plexus-blue text-white font-bold rounded-lg hover:bg-plexus-blue-dark transition-colors"
            >
              Start New Case
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((completedCase) => (
              <Card
                key={completedCase.id}
                className="p-5 hover:shadow-lg transition-shadow duration-300 cursor-pointer border-l-4 border-plexus-blue"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-plexus-blue">
                      {completedCase.medicalCase.patient.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(completedCase.createdAt instanceof Timestamp ? completedCase.createdAt.toDate() : new Date())}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {getCorrectnessIcon(completedCase.correctness)}
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getCorrectnessColor(completedCase.correctness)}`}>
                      {completedCase.correctness}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Specialty:</span>
                    <span className="font-medium">{completedCase.medicalCase.specialty}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Rarity:</span>
                    <span className={`font-medium ${getRarityColor(completedCase.medicalCase.rarity)}`}>
                      {completedCase.medicalCase.rarity}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Confidence:</span>
                    <span className={`font-bold ${confidenceColor(completedCase.confidence)}`}>
                      {completedCase.confidence}%
                    </span>
                  </div>

                  <div className="pt-2 mt-2 border-t border-gray-100">
                    <p className="text-sm text-gray-700 truncate" title={completedCase.medicalCase.underlyingDiagnosis}>
                      <span className="font-semibold">Correct:</span> {completedCase.medicalCase.underlyingDiagnosis}
                    </p>
                    <p className="text-sm text-gray-700 truncate" title={completedCase.userDiagnosis}>
                      <span className="font-semibold">Your:</span> {completedCase.userDiagnosis}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the card click
                    handleViewCase(completedCase.id);
                  }}
                  className="mt-4 w-full py-2 bg-plexus-blue text-white text-sm font-medium rounded-lg hover:bg-plexus-blue-dark transition-colors"
                >
                  View Details
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};