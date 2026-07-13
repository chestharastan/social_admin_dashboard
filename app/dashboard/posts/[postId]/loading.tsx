export default function PostDetailsLoading() {
  return (
    <div className="animate-pulse space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <div className="h-28 rounded-xl bg-slate-200" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="h-[520px] rounded-xl bg-white" />
        <div className="h-[420px] rounded-xl bg-white" />
      </div>
    </div>
  );
}
