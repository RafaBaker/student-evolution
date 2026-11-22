import { network } from "hardhat";
import { formatEther, isAddress, parseEther } from "viem";
import type { Address } from "viem";

function parseRateWeiPerToken(): bigint {
  const raw = process.env.RAM_RATE_WEI_PER_TOKEN?.trim();
  if (!raw) {
    return 1000n;
  }

  const rate = BigInt(raw);
  if (rate <= 0n) {
    throw new Error("RAM_RATE_WEI_PER_TOKEN deve ser maior que 0.");
  }
  return rate;
}

function parseInitialLiquidityWei(): bigint {
  const raw = process.env.RAM_INITIAL_LIQUIDITY_ETH?.trim();
  if (!raw) {
    return parseEther("0.001");
  }

  const value = parseEther(raw);
  if (value < 0n) {
    throw new Error("RAM_INITIAL_LIQUIDITY_ETH nao pode ser negativo.");
  }
  return value;
}

function parseAuthorizedSalas(): Address[] {
  const raw = process.env.RAM_AUTHORIZED_SALAS?.trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((addr) => addr.trim())
    .filter(Boolean)
    .map((addr) => {
      if (!isAddress(addr)) {
        throw new Error(`Endereco de sala invalido em RAM_AUTHORIZED_SALAS: ${addr}`);
      }
      return addr;
    });
}

async function main() {
  const { viem, networkName } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  const rateWeiPerToken = parseRateWeiPerToken();
  const initialLiquidityWei = parseInitialLiquidityWei();
  const authorizedSalas = parseAuthorizedSalas();

  console.log(`Rede: ${networkName}`);
  console.log(`Deployer (admin): ${deployer.account.address}`);

  const deployerBalance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log(`Saldo do deployer: ${formatEther(deployerBalance)} ETH`);

  // 1. Deploy do RAMToken (IRAMToken e apenas a interface utilizada pelo RAMExchange)
  console.log("\nFazendo deploy do RAMToken...");
  const ramToken = await viem.deployContract("RAMToken");
  console.log(`RAMToken deployed em: ${ramToken.address}`);

  // 2. Autorizar salas iniciais (opcional, via RAM_AUTHORIZED_SALAS=0x...,0x...)
  for (const sala of authorizedSalas) {
    const txHash = await ramToken.write.setSalasAutorizadas([sala, true]);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`Sala autorizada no RAMToken: ${sala}`);
  }

  // 3. Deploy do RAMExchange passando o endereco do RAMToken, taxa e liquidez inicial em ETH
  console.log("\nFazendo deploy do RAMExchange...");
  const ramExchange = await viem.deployContract(
    "RAMExchange",
    [ramToken.address, rateWeiPerToken],
    initialLiquidityWei > 0n ? { value: initialLiquidityWei } : undefined,
  );
  console.log(`RAMExchange deployed em: ${ramExchange.address}`);

  // 4. Conferencia do estado on-chain apos o deploy
  const [tokenAdmin, tokenDecimals, exchangeAdmin, exchangeToken, exchangeRate, tokenScale, exchangeBalance] =
    await Promise.all([
      ramToken.read.admin(),
      ramToken.read.decimals(),
      ramExchange.read.admin(),
      ramExchange.read.methods(),
      ramExchange.read.rateWeiPerToken(),
      ramExchange.read.tokenScale(),
      publicClient.getBalance({ address: ramExchange.address }),
    ]);

  console.log("\n=== Resumo do Deploy ===");
  console.log(`RAMToken:            ${ramToken.address}`);
  console.log(`  admin:             ${tokenAdmin}`);
  console.log(`  decimals:          ${tokenDecimals}`);
  console.log(`RAMExchange:         ${ramExchange.address}`);
  console.log(`  admin:             ${exchangeAdmin}`);
  console.log(`  token (IRAMToken): ${exchangeToken}`);
  console.log(`  rateWeiPerToken:   ${exchangeRate.toString()} wei`);
  console.log(`  tokenScale:        ${tokenScale.toString()}`);
  console.log(`  liquidez (ETH):    ${formatEther(exchangeBalance)} ETH`);
}

main().catch((error) => {
  console.error("Erro no deploy:", error);
  process.exitCode = 1;
});
