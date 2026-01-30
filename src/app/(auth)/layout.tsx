export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">ReviewFlow</h1>
          <p className="text-neutral-500 mt-2">Video review & collaboration</p>
        </div>
        {children}
      </div>
    </div>
  );
}
