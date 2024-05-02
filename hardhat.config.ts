import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  defaultNetwork: "localhost",
  networks: {
    OBI: {
      url: "http://localhost:8080/obi/api/v1/rpc",
      allowUnlimitedContractSize: true,
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      ],
    },
    localhost: {
      chainId: 31337,
      //blockGasLimit: 12000000,
    },
  },
};

export default config;
