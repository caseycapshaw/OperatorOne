import "@/styles/globals.css";

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid-bg flex min-h-screen items-center justify-center">
      {children}
    </div>
  );
}
