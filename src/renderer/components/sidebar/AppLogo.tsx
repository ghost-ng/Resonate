export default function AppLogo() {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/20">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="7" stroke="#5b8def" strokeWidth="1.5" />
          <circle cx="8" cy="8" r="3" fill="#5b8def" />
        </svg>
      </div>
      <span className="text-lg font-semibold text-text">youRecord</span>
    </div>
  );
}
