import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig, task } from "hardhat/config";

const createGreeter = task("create-greeter", "Create a Greeter in an existing Factory")
  .addPositionalArgument({
    name: "factoryAddress",
    description: "Address of the deployed Factory",
  })
  .addPositionalArgument({
    name: "greeting",
    description: "Initial greeting for the Greeter",
  })
  .setAction(() => import("./tasks/create-greeter.js"))
  .build();

const greeterDemo = task("greeter-demo", "Create a Greeter and update its greeting")
  .addPositionalArgument({
    name: "factoryAddress",
    description: "Address of the deployed Factory",
  })
  .addPositionalArgument({
    name: "greeting",
    description: "Initial greeting for the Greeter",
  })
  .addPositionalArgument({
    name: "newGreeting",
    description: "Greeting to set after creating the Greeter",
  })
  .setAction(() => import("./tasks/create-greeter.js"))
  .build();

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  tasks: [createGreeter, greeterDemo],
  solidity: {
    profiles: {
      default: {
        version: "0.8.34",
      },
      production: {
        version: "0.8.34",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
