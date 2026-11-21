import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth';
import Header from '../components/Header';

export const metadata: Metadata = {
  title: 'InnerCircle',
  description: 'Support the creators you love.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen bg-white text-neutral-900">
          <AuthProvider>
            <Header />
            <main>{children}</main>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
