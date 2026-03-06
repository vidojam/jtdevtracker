export default function LoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/25">
      <div className="rounded-md bg-white px-4 py-3 text-sm font-medium shadow dark:bg-slate-800">Processing...</div>
    </div>
  );
}
