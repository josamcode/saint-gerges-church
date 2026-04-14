import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import Button from './Button';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-page flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-danger-light flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-danger" />
            </div>
            <h1 className="text-xl font-bold text-heading mb-2">حدث خطأ غير متوقع</h1>
            <p className="text-muted mb-6">
              نعتذر عن هذا الخطأ. يرجى إعادة تحميل الصفحة أو التواصل مع الدعم الفني.
            </p>
            <Button
              onClick={() => window.location.reload()}
              icon={RotateCcw}
            >
              إعادة تحميل الصفحة
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
