export default function Header() {
  return (
    <header className="flex w-full items-center justify-between py-6">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-base font-bold text-white">
          R
        </div>

        <div>
          <p className="text-lg font-bold leading-none text-gray-900">
            RetailMind
          </p>
          <p className="mt-1 hidden text-xs text-gray-500 sm:block">
            AI-Powered Retail Location Intelligence
          </p>
        </div>
      </div>

      <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500">
        Beta
      </span>
    </header>
  );
}
