type LayoutQuizProps = {
  children: React.ReactNode;
};

export default function LayoutQuiz({ children }: LayoutQuizProps) {
  return (
    <main className="min-h-screen bg-bg px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[720px] rounded-3xl border border-zinc-800 bg-surface/80 p-6 shadow-2xl shadow-black/40 sm:p-8">
        {children}
      </div>
    </main>
  );
}
