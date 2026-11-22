import { network } from "hardhat";
import { formatEther, isAddress, parseEther } from "viem";

async function main() {
  const exchangeAddress = process.env.RAM_EXCHANGE_ADDRESS?.trim();
  if (!exchangeAddress || !isAddress(exchangeAddress)) {
    throw new Error(
      "Defina RAM_EXCHANGE_ADDRESS com um endereco valido do contrato RAMExchange.",
    );
  }

  const amountEth = process.env.LIQUIDITY_ETH?.trim();
  if (!amountEth) {
    throw new Error("Defina LIQUIDITY_ETH com a quantidade de ETH a depositar (ex: 0.05).");
  }

  const amountWei = parseEther(amountEth);
  if (amountWei <= 0n) {
    throw new Error("LIQUIDITY_ETH deve ser maior que 0.");
  }

  const { viem, networkName } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [admin] = await viem.getWalletClients();

  const ramExchange = await viem.getContractAt("RAMExchange", exchangeAddress);

  console.log(`Rede: ${networkName}`);
  console.log(`Admin: ${admin.account.address}`);
  console.log(`RAMExchange: ${ramExchange.address}`);
  console.log(`Depositando ${amountEth} ETH de liquidez...`);

  const txHash = await ramExchange.write.depositarLiquidez({ value: amountWei });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  const updatedBalance = await publicClient.getBalance({
    address: ramExchange.address,
  });

  console.log(`Transacao confirmada no bloco ${receipt.blockNumber}: ${txHash}`);
  console.log(`Novo saldo do RAMExchange: ${formatEther(updatedBalance)} ETH`);
}

main().catch((error) => {
  console.error("Erro ao depositar liquidez:", error);
  process.exitCode = 1;
});
