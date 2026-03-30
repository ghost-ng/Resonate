export default function AppLogo() {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <img
        src="/logo.png"
        alt="Resonate"
        className="h-7 w-7 rounded-md"
        draggable={false}
        onError={(e) => {
          // Fallback to SVG if image fails to load
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <span className="text-lg font-semibold text-text">Resonate</span>
    </div>
  );
}
