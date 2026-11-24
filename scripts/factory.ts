import { network } from "hardhat";

const { viem } = await network.create();
const factory = await viem.deployContract("Factory");

console.log("Factory implantada em:", factory.address);
