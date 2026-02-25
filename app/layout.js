import './globals.css';

export const metadata = {
  title: 'AI Brain Studio',
  description: 'Lightweight Next.js v0 skeleton for a brain orchestrator.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
