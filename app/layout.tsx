import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Junior Cricket Management',
  description: 'Multi-school junior cricket management platform',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
