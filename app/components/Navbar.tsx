"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 ">
      <div className="bg-white rounded-full px-6 py-3 shadow-lg border border-gray-200">
        <ul className="flex items-center space-x-8">
          <li>
            <Link
              href="/"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                pathname === "/"
                  ? "text-black"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={pathname === "/" ? "text-black" : "text-gray-500"}
              >
                <path
                  d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 22V12H15V22"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-sm font-medium">Home</span>
            </Link>
          </li>
          <li>
            <Link
              href="/friends"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                pathname === "/friends"
                  ? "text-black"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={
                  pathname === "/friends" ? "text-black" : "text-gray-500"
                }
              >
                <path
                  d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="9"
                  cy="7"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M23 21V19C23 18.1645 22.7155 17.3541 22.2094 16.6977C21.7033 16.0413 20.9999 15.5717 20.2 15.36"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-sm font-medium">Friends</span>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
