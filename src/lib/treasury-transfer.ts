import { ethers, type Eip1193Provider } from "ethers";
import { BASE_CHAIN_ID, BASE_TOKENS, TOKEN_ABI, assertTransferFunds, validateTransfer, type TransferToken } from "@/lib/treasury";

export interface TransferReview {
  source: string;
  destination: string;
  token: TransferToken;
  amount: string;
  preparedAt: number;
}

async function walletContext(ethereum: Eip1193Provider, source: string) {
  await ethereum.request({ method: "eth_requestAccounts" });
  if (await ethereum.request({ method: "eth_chainId" }) !== "0x2105") {
    await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x2105" }] });
  }
  const provider = new ethers.BrowserProvider(ethereum);
  if ((await provider.getNetwork()).chainId !== BigInt(BASE_CHAIN_ID)) throw new Error("Switch your wallet to Base before continuing.");
  const signer = await provider.getSigner();
  if ((await signer.getAddress()).toLowerCase() !== source.toLowerCase()) {
    throw new Error(`Select the treasury account ${source} in your wallet. No transfer was sent.`);
  }
  return { provider, signer };
}

async function checkFunds(provider: ethers.BrowserProvider, input: TransferReview) {
  const transfer = validateTransfer(input, input.source);
  const eth = await provider.getBalance(input.source, "pending");
  const balance: bigint = transfer.token === "ETH" ? eth : await new ethers.Contract(BASE_TOKENS.USDC.contract, TOKEN_ABI, provider).balanceOf(input.source);
  assertTransferFunds(transfer.token, transfer.units, balance, eth);
  const transaction = transfer.token === "ETH"
    ? { to: transfer.destination, value: transfer.units, chainId: BASE_CHAIN_ID }
    : { to: BASE_TOKENS.USDC.contract, value: BigInt(0), chainId: BASE_CHAIN_ID,
        data: new ethers.Interface(TOKEN_ABI).encodeFunctionData("transfer", [transfer.destination, transfer.units]) };
  // Simulation only. The wallet displays the final fee before the user signs.
  await provider.estimateGas({ ...transaction, from: input.source });
  return transaction;
}

export async function prepareTreasuryTransfer(ethereum: Eip1193Provider, source: string, input: { token: string; amount: string; destination: string }): Promise<TransferReview> {
  const valid = validateTransfer(input, source);
  const review: TransferReview = { source: ethers.getAddress(source), destination: valid.destination, token: valid.token, amount: valid.amount, preparedAt: Date.now() };
  const { provider } = await walletContext(ethereum, source);
  try { await checkFunds(provider, review); return review; }
  finally { provider.destroy(); }
}

// Called only by the admin's explicit confirmation in their own browser.
// No server-held wallet seed or treasury private key is imported here.
export async function requestTreasuryTransfer(ethereum: Eip1193Provider, review: TransferReview): Promise<string> {
  if (Date.now() - review.preparedAt > 120_000) throw new Error("This review expired. Prepare the transfer again to refresh the balances.");
  const { provider, signer } = await walletContext(ethereum, review.source);
  try {
    const transaction = await checkFunds(provider, review);
    const response = await signer.sendTransaction(transaction);
    return response.hash;
  } finally { provider.destroy(); }
}

export function transferError(error: unknown): string {
  if (ethers.isError(error, "ACTION_REJECTED")) return "Cancelled in your wallet. No new transfer was submitted by Treasury.";
  if (error instanceof Error && !('code' in error)) return error.message;
  return "The wallet could not complete this request. Check its activity before retrying, and confirm the account, Base network, and gas balance.";
}
