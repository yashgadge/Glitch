import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-[#111] border border-red-500/30 rounded-xl p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6 text-red-500">
              <AlertTriangle className="w-10 h-10" />
              <h1 className="text-3xl font-bebas tracking-widest">FATAL SYSTEM ERROR</h1>
            </div>
            
            <div className="mb-6 space-y-2">
              <p className="text-gray-300 font-inter text-sm">
                A critical rendering error occurred in the React component tree. The application was halted to prevent corrupted state.
              </p>
              
              <div className="bg-black/50 p-4 rounded border border-white/10 overflow-x-auto">
                <p className="font-mono text-red-400 text-sm font-bold mb-2">
                  {this.state.error && this.state.error.toString()}
                </p>
                <pre className="font-mono text-gray-500 text-xs whitespace-pre-wrap">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bebas tracking-wider rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" /> REBOOT SYSTEM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
