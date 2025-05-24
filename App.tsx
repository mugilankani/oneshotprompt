
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import QuizCreatorPage from './pages/QuizCreatorPage';
import QuizPlayerPage from './pages/QuizPlayerPage';

const App: React.FC = () => {
  return (
    <div className="flex flex-col flex-grow">
      <header className="bg-slate-800 text-white shadow-lg">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            {/* Replace with an actual logo if available */}
            <svg className="h-8 w-8 mr-2 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v11.494m0 0A8.493 8.493 0 0012 21.747a8.493 8.493 0 000-17.494 8.493 8.493 0 000 3.998z" />
            </svg>
            <h1 className="text-xl font-semibold tracking-tight">
              Classroom Quiz Platform
            </h1>
          </div>
          {/* Future navigation links could go here */}
        </nav>
      </header>

      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white shadow-xl rounded-lg p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-12rem)]">
          <Routes>
            <Route path="/create" element={<QuizCreatorPage />} />
            <Route path="/play" element={<QuizPlayerPage />} />
            <Route path="*" element={<Navigate to="/create" replace />} />
          </Routes>
        </div>
      </main>

      <footer className="bg-slate-100 border-t border-slate-300 text-slate-600 py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:p8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Classroom Quiz Platform. Empowering educators and students.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;