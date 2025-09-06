"use client ";

import { FriendsManager } from "../components/FriendsManager";

export default function Friends() {
  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)] pb-20">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <main className="flex-1">
          <FriendsManager />
        </main>
      </div>
    </div>
  );
}
