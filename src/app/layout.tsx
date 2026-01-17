import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { WebRTCProvider } from '@/contexts/WebRTCContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MeraVC - Free Video Chat App',
  description: 'Connect face-to-face with friends and family through secure, high-quality video calls',
  keywords: 'video chat, video call, online meeting, webrtc, free video call',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <WebRTCProvider>
            {children}
          </WebRTCProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
