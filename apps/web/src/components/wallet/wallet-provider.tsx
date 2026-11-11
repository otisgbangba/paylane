"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserDTO, WalletDTO } from "@paylane/shared";
import { apiRequest } from "@/lib/client-api";

interface WalletContextValue {
  user: UserDTO;
  wallet: WalletDTO;
  applyWallet: (wallet: WalletDTO) => void;
  applyUser: (user: UserDTO) => void;
  refresh: () => Promise<void>;
  fundOpen: boolean;
  fundReason: string | null;
  openFund: (reason?: string) => void;
  closeFund: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({
  initialUser,
  children,
}: {
  initialUser: UserDTO;
  children: ReactNode;
}) {
  const [user, setUser] = useState<UserDTO>(initialUser);
  const [fundOpen, setFundOpen] = useState(false);
  const [fundReason, setFundReason] = useState<string | null>(null);

  const applyWallet = useCallback((wallet: WalletDTO) => {
    setUser((current) => ({ ...current, wallet }));
  }, []);

  const applyUser = useCallback((next: UserDTO) => setUser(next), []);

  const refresh = useCallback(async () => {
    const response = await apiRequest<{ user: UserDTO }>("/auth/me");
    if (response.success) setUser(response.data.user);
  }, []);

  const openFund = useCallback((reason?: string) => {
    setFundReason(reason ?? null);
    setFundOpen(true);
  }, []);

  const closeFund = useCallback(() => {
    setFundOpen(false);
    setFundReason(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      wallet: user.wallet,
      applyWallet,
      applyUser,
      refresh,
      fundOpen,
      fundReason,
      openFund,
      closeFund,
    }),
    [user, applyWallet, applyUser, refresh, fundOpen, fundReason, openFund, closeFund],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside WalletProvider");
  return context;
}
