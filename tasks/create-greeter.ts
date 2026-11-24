import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import { getAddress, isAddressEqual, parseEventLogs } from "viem";

export default async function createGreeter(
  {
    factoryAddress,
    greeting,
    newGreeting,
  }: { factoryAddress: string; greeting: string; newGreeting?: string },
  { network }: HardhatRuntimeEnvironment,
) {
  const address = getAddress(factoryAddress);
  const { viem } = await network.create();
  const client = await viem.getPublicClient();
  const bytecode = await client.getBytecode({ address });

  if (bytecode === undefined || bytecode === "0x") {
    throw new Error(`No contract is deployed at ${address} on the selected network.`);
  }

  const factory = await viem.getContractAt("Factory", address);
  const hash = await factory.write.CreateNewGreeter([greeting]);
  const receipt = await client.waitForTransactionReceipt({ hash });

  if (receipt.status !== "success") {
    throw new Error(`CreateNewGreeter transaction reverted: ${hash}`);
  }

  console.log("Greeter created. Transaction hash:", hash);

  if (newGreeting === undefined) {
    return;
  }

  const [created] = parseEventLogs({
    abi: factory.abi,
    eventName: "GreeterCreated",
    logs: receipt.logs.filter((log) => isAddressEqual(log.address, address)),
  });

  if (created === undefined) {
    throw new Error(
      `Transaction ${hash} did not emit GreeterCreated. Deploy the current Factory to run greeter-demo.`,
    );
  }

  const { index } = created.args;
  const greeterAddress = await factory.read.GreeterArray([index]);
  console.log(`Factory ${factory.address} GreeterArray(${index}):`, greeterAddress);

  const greeter = await viem.getContractAt("Greeter", greeterAddress);
  console.log("Initial greeting:", await greeter.read.greet());

  const updateHash = await greeter.write.setGreeting([newGreeting]);
  const updateReceipt = await client.waitForTransactionReceipt({ hash: updateHash });

  if (updateReceipt.status !== "success") {
    throw new Error(`setGreeting transaction reverted: ${updateHash}`);
  }

  const updatedGreeting = await greeter.read.greet();
  console.log("Updated greeting:", updatedGreeting);

  if (updatedGreeting !== newGreeting) {
    throw new Error(`Unexpected greeting after setGreeting transaction ${updateHash}.`);
  }
}
