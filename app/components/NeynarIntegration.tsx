"use client";

/**
 * Example integration with Neynar React SDK for full Farcaster social features
 * 
 * To use this, you need to:
 * 1. Install: npm install @neynar/react
 * 2. Add NEXT_PUBLIC_NEYNAR_CLIENT_ID to your .env.local
 * 3. Wrap your app with NeynarContextProvider
 * 4. Import the CSS: import "@neynar/react/dist/style.css"
 */

import { useEffect, useState } from "react";

// Uncomment these imports after installing @neynar/react
// import { 
//   NeynarContextProvider, 
//   NeynarAuthButton, 
//   NeynarProfileCard,
//   useNeynarContext,
//   Theme 
// } from "@neynar/react";

interface NeynarProviderWrapperProps {
  children: React.ReactNode;
}

// Example provider setup - uncomment after installing @neynar/react
export function NeynarProviderWrapper({ children }: NeynarProviderWrapperProps) {
  return (
    <div>
      {/* Uncomment this after installing @neynar/react and setting up environment variables
      <NeynarContextProvider
        settings={{
          clientId: process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || "",
          defaultTheme: Theme.Dark,
          eventsCallbacks: {
            onAuthSuccess: () => {
              console.log("Farcaster auth successful!");
            },
            onSignout: () => {
              console.log("Farcaster signed out");
            },
          },
        }}
      >
        {children}
      </NeynarContextProvider>
      */}
      {children}
    </div>
  );
}

// Example auth button component
export function FarcasterAuthButton({ className }: { className?: string }) {
  return (
    <div className={className}>
      {/* Uncomment after installing @neynar/react
      <NeynarAuthButton />
      */}
      <button className="px-4 py-2 bg-purple-600 text-white rounded-lg">
        Connect Farcaster (Install @neynar/react first)
      </button>
    </div>
  );
}

// Example profile display using Neynar components
export function NeynarProfileDisplay() {
  // Uncomment after installing @neynar/react
  // const { user } = useNeynarContext();

  const user = null; // Placeholder

  if (!user) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Sign in with Farcaster to see your profile</p>
        <FarcasterAuthButton className="mt-2" />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Uncomment after installing @neynar/react
      <NeynarProfileCard fid={user.fid} />
      */}
      <div className="text-center text-gray-500">
        Install @neynar/react to use NeynarProfileCard
      </div>
    </div>
  );
}

// Example hook for using Neynar context
export function useFarcasterUser() {
  const [user, setUser] = useState(null);

  // Uncomment after installing @neynar/react
  // const { user: neynarUser } = useNeynarContext();
  
  useEffect(() => {
    // setUser(neynarUser);
  }, []);

  return { user };
}

/**
 * Complete setup instructions:
 * 
 * 1. Install the package:
 *    npm install @neynar/react
 * 
 * 2. Get your Neynar Client ID:
 *    - Go to https://dev.neynar.com/
 *    - Create an account and app
 *    - Copy your Client ID
 * 
 * 3. Add to .env.local:
 *    NEXT_PUBLIC_NEYNAR_CLIENT_ID=your_client_id_here
 * 
 * 4. Update your layout.tsx:
 *    import "@neynar/react/dist/style.css";
 *    // Wrap your app with NeynarProviderWrapper
 * 
 * 5. Uncomment the imports and code in this file
 * 
 * 6. Use the components:
 *    - <FarcasterAuthButton /> for sign in
 *    - <NeynarProfileDisplay /> to show user profile
 *    - useFarcasterUser() hook to access user data
 */
