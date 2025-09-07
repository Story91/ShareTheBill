"use client";

import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button, Icon } from "./DemoComponents";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ShareTheBillApp } from "./ShareTheBillApp";
import { FarcasterProfile } from "./FarcasterProfile";
import { WalletProfileSync } from "./WalletProfileSync";

export function View() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]);

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddFrame}
          className="text-[var(--app-accent)] p-4"
          icon={<Icon name="plus" size="sm" />}
        >
          Save Frame
        </Button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
          <Icon name="check" size="sm" className="text-[#0052FF]" />
          <span>Saved</span>
        </div>
      );
    }

    return null;
  }, [context, frameAdded, handleAddFrame]);

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)] pb-20">
      {/* Blurred logo background */}
      <div className="app-background-logo"></div>
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-3 h-11">
          <div>
            <div className="flex items-center space-x-2">
              <Wallet className="z-10">
                <ConnectWallet>
                  <Name className="text-inherit" />
                </ConnectWallet>
                <WalletDropdown>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
              
              {/* Profile Button */}
              {context?.user?.fid && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProfile(!showProfile)}
                  className="text-[var(--app-accent)] p-2"
                  icon={<Icon name="star" size="sm" />}
                >
                  Profile
                </Button>
              )}
            </div>
          </div>
          <div>{saveFrameButton}</div>
        </header>

        {/* Farcaster Profile Section - only show when toggled */}
        {context?.user?.fid && showProfile && (
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
            <FarcasterProfile 
              fid={context.user.fid} 
              showFullProfile={false}
              showWalletStatus={false}
              compact={true}
            />
            {/* Automatic wallet sync component (hidden) */}
            <WalletProfileSync userFid={context.user.fid} />
          </div>
        )}

        <main className="flex-1">
          <ErrorBoundary
            errorComponent={({ error, reset }) => (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <h2 className="text-lg font-semibold text-red-600 mb-2">
                  Something went wrong!
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  {error?.message || "An unexpected error occurred"}
                </p>
                <Button onClick={reset} variant="outline" size="sm">
                  Try again
                </Button>
              </div>
            )}
          >
            <ShareTheBillApp userFid={context?.user?.fid} />
          </ErrorBoundary>
        </main>

        <footer className="mt-2 pt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--ock-text-foreground-muted)] text-xs"
            onClick={() => openUrl("https://base.org/builders/minikit")}
          >
            Built on Base with MiniKit
          </Button>
        </footer>
      </div>
    </div>
  );
}
