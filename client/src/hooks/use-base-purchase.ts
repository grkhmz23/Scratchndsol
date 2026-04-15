import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { erc20Abi } from 'viem';
import { base, baseSepolia } from 'wagmi/chains';
import { useState } from 'react';

const USDC_CONTRACTS: Record<number, `0x${string}`> = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

export function useBasePurchase() {
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const [pendingHash, setPendingHash] = useState<`0x${string}` | null>(null);
  const receipt = useWaitForTransactionReceipt({ hash: pendingHash ?? undefined });

  const purchase = async ({
    ticketCost,
    poolWallet,
    chainId,
  }: {
    ticketCost: number;
    poolWallet: `0x${string}`;
    chainId: number;
  }): Promise<`0x${string}`> => {
    const usdcContract = USDC_CONTRACTS[chainId];
    if (!usdcContract) {
      throw new Error('Unsupported Base chain');
    }
    const amountRaw = parseUnits(ticketCost.toString(), 6);
    const hash = await writeContractAsync({
      address: usdcContract,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [poolWallet, amountRaw],
      chainId,
    });
    setPendingHash(hash);
    return hash;
  };

  return {
    purchase,
    receipt,
    pendingHash,
    isWritePending,
  };
}
