import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center bg-surface px-6 text-center">
      <div className="text-5xl">🫧</div>
      <h1 className="mt-4 font-display text-2xl font-extrabold">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-soft">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link href="/" className="btn-primary mt-6 px-6">Back to Household Maids</Link>
    </div>
  );
}
