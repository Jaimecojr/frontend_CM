"use client";

export function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm text-white text-xl font-semibold">
      {message}
    </div>
  );
}
