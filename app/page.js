import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>AI Brain Project</h1>
      <p>This is a v0 Next.js skeleton. Open Studio to test query flow.</p>
      <Link href="/studio">Go to Studio</Link>
    </main>
  );
}
