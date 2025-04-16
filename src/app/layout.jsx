import '@/styles/globals.css';
import { Providers } from './providers';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'FloorMates',
  description: 'Connect with your dorm floor',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-dark text-accent">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 p-6 overflow-y-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
