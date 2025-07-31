import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">
                🎯 Trading Opportunities
              </h1>
              <span className="text-sm text-gray-400 bg-gray-700 px-2 py-1 rounded">
                Alpha Scanner
              </span>
            </div>
            
            <nav className="flex space-x-6">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/opportunities"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/opportunities') 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                Opportunities
              </Link>
              <Link
                to="/risk-sandbox"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/risk-sandbox') 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                Risk Sandbox
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-4">
              <span>© 2025 Trading Opportunities Platform</span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="API Connected"></span>
              <span>API Connected</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span>Real-time market data</span>
              <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                v0.1.0
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;