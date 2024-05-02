//import { ethers  } from "hardhat";
import {
  AccessList,
  Signature,
  TransactionLike,
  accessListify,
  assertArgument,
  decodeRlp,
  ethers,
  getAddress,
  getBigInt,
  getBytes,
  getNumber,
  hexlify,
  isHexString,
  keccak256,
  zeroPadValue,
} from "ethers";
//import { ethers } from "hardhat";
import hre from "hardhat";

import factoryJSON from "../artifacts/contracts/Factory.sol/Factory.json";

async function main() {
  const { chainId } = hre.network.config;
  const networkName = await hre.network.name;
  console.log({ networkName, chainId });
  const provider = await new ethers.JsonRpcProvider("http://127.0.0.1:8545/");

  const wallet = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider
  );

  const Factory = await new ethers.ContractFactory(
    factoryJSON.abi,
    factoryJSON.bytecode
  );

  const factoryDeployTx = await Factory.getDeployTransaction();

  const estimateDeployGas = await provider.estimateGas(factoryDeployTx);
  console.log({ estimateDeployGas });

  const gasLimit = estimateDeployGas;
  const maxFeePerGas = ethers.toBigInt(900000000);
  const signedDeployTx = await wallet.signTransaction({
    ...factoryDeployTx,
    chainId,
    gasLimit,
    maxFeePerGas,
    nonce: await wallet.getNonce(),
  });

  console.log({ signedDeployTx });
  //How do i call create
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
