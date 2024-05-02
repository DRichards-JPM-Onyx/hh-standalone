import { ethers } from "ethers";
import factoryJSON from "../artifacts/contracts/Factory.sol/Factory.json";
import hre from "hardhat";

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545/");
  const wallet = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider
  );

  const instanceAddress = "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9";
  const factory = new ethers.Contract(instanceAddress, factoryJSON.abi, wallet);

  const factoryNonce = await provider.getTransactionCount(instanceAddress);

  const createTx = await factory
    .getFunction("create")
    .populateTransaction(wallet.address, BigInt(1));

  console.log({ createTx });
  //createTx.to = instanceAddress;

  const gasLimit = await provider.estimateGas(createTx);
  const { chainId } = hre.network.config;
  const maxFeePerGas = ethers.toBigInt(900000000);

  createTx.chainId = BigInt(chainId!);
  createTx.gasLimit = gasLimit;
  createTx.maxFeePerGas = maxFeePerGas;
  createTx.nonce = await wallet.getNonce();

  const signedCreateTxAddedVals = await wallet.signTransaction(createTx);

  const txFrom = ethers.Transaction.from(signedCreateTxAddedVals);
  console.log({
    signedCreateTxAddedVals,
    nonce: txFrom.nonce,
  });

  const prospectiveAddress = ethers.getCreateAddress({
    from: instanceAddress,
    nonce: 1,
  });

  console.log({ prospectiveAddress });
  //const contractAddresses = await factory.testContracts();
  //console.log({ contractAddresses });

  //returned transactionReceipt
  //get address from txReceipt

  ////have hash
  //send hash
  //will check if addess has acces to parent contract based on result.to

  //make To deactivated
  //haveTxReceipt
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
