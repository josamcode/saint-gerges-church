import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../auth/auth.hooks';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { I18nProvider, useI18n } from '../i18n/i18n';
import { SocketProvider } from '../realtime/socket.provider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default function Providers({ children }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <SocketProvider>
              {children}
              <LocalizedToaster />
            </SocketProvider>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function LocalizedToaster() {
  const { isRTL } = useI18n();

  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      toastOptions={{
        duration: 4000,
        style: {
          fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
          direction: isRTL ? 'rtl' : 'ltr',
          textAlign: isRTL ? 'right' : 'left',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
          borderRadius: '0.5rem',
          padding: '12px 16px',
          fontSize: '14px',
          boxShadow: 'var(--shadow-md)',
        },
        success: {
          iconTheme: { primary: 'var(--color-success)', secondary: '#fff' },
        },
        error: {
          iconTheme: { primary: 'var(--color-danger)', secondary: '#fff' },
        },
      }}
    />
  );
}
