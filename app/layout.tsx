import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '율턴 식당 공유 사이트',
  description: '식대 식당을 서로 공유해보아요 ~~',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
