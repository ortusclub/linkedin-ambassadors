import { ethers } from "ethers";

const USDC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

let _provider: ethers.JsonRpcProvider | null = null;

export function getBaseProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || "https://mainnet.base.org");
  }
  return _provider;
}

export function getUsdcContract(signerOrProvider?: ethers.Signer | ethers.Provider): ethers.Contract {
  const address = process.env.USDC_CONTRACT_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  return new ethers.Contract(address, USDC_ABI, signerOrProvider || getBaseProvider());
}

export function getDepositAddress(derivationIndex: number): { address: string; privateKey: string } {
  const mnemonic = process.env.HD_WALLET_SEED_PHRASE;
  if (!mnemonic) throw new Error("HD_WALLET_SEED_PHRASE not configured");

  const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0");
  const child = hdNode.deriveChild(derivationIndex);
  return { address: child.address, privateKey: child.privateKey };
}

export function getChildWallet(derivationIndex: number): ethers.Wallet {
  const { privateKey } = getDepositAddress(derivationIndex);
  return new ethers.Wallet(privateKey, getBaseProvider());
}


export function getTreasuryAddress(): string {
  return process.env.TREASURY_WALLET_ADDRESS || "0x953f06a4229e451f0Bc5E589a763EE5A9058882D";
}

// USDC on Base has 6 decimals
export function parseUsdc(amount: string | number): bigint {
  return ethers.parseUnits(String(amount), 6);
}

export function formatUsdc(amount: bigint): string {
  return ethers.formatUnits(amount, 6);
}
