import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { PageTransition } from '@/components/page-transition';
import { ToastProvider } from '@/components/toast-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ProctorFlow AI',
  description: 'AI-Powered Proctored Coding Exam Platform for Colleges',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary-foreground flex flex-col`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          storageKey="cipher-theme"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            <PageTransition>
              {children}
            </PageTransition>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
