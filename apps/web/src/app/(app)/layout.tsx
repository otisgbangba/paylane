import { AppShell } from "@/components/app-shell/app-shell";
import { FundWalletModal } from "@/components/wallet/fund-wallet-modal";
import { WalletProvider } from "@/components/wallet/wallet-provider";
import { requireUser } from "@/lib/server-api";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <WalletProvider initialUser={user}>
      <AppShell>{children}</AppShell>
      <FundWalletModal />
    </WalletProvider>
  );
}
