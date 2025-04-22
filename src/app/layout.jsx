import '@/styles/globals.css';
import { Providers } from './providers';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'FloorMates',
  description: 'Connect with your dorm floor',
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full bg-dark">
      <body className="h-full flex text-accent">
        <Providers>
          <div className="flex w-full h-full">
            <Sidebar />
            <main className="flex-1 h-screen overflow-y-auto">
              <div className="p-4 md:p-6">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
