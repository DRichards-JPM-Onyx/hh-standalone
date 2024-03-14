//import { ethers  } from "hardhat";
import { ethers } from "ethers";

import factoryJSON from "../artifacts/contracts/Factory.sol/Factory.json";
import testContractJson from "../artifacts/contracts/TestContract.sol/TestContract.json";

async function main() {
  const connectionInfo = {
    url: "http://localhost:8080/obi/api/v1/rpc",
    headers: {
      Authorization:
        "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IlhSdmtvOFA3QTNVYVdTblU3Yk05blQwTWpoQSJ9.eyJhdWQiOiIzOTYwYmNjZS1mMWZmLTQwNjYtOTAwOS1mZGJkOTE0ZmUxYzciLCJpc3MiOiJodHRwczovL2xvZ2luLm1pY3Jvc29mdG9ubGluZS5jb20vOWEwODgyZmEtMGJiYy00Mjk4LThjYTEtNDVlYzM3MjMxYWIxL3YyLjAiLCJpYXQiOjE3MTAzNDIxNTQsIm5iZiI6MTcxMDM0MjE1NCwiZXhwIjoxNzEwMzcxMjU0LCJhaW8iOiJFMk5nWUdBWDhUM0RHUkFZc3Y1bjZzZDcwNktQWEppUm1xdXppL1Z2OFNMRnp5S2hvVndBIiwiYXpwIjoiMzk2MGJjY2UtZjFmZi00MDY2LTkwMDktZmRiZDkxNGZlMWM3IiwiYXpwYWNyIjoiMSIsIm9pZCI6IjljYjU0MTliLTVmY2MtNGU0MS1hNGFlLTFlZTBlZGI0NTg2YiIsInJoIjoiMC5BUlVBLW9JSW1yd0xtRUtNb1VYc055TWFzYzY4WURuXzhXWkFrQW45dlpGUDRjY1ZBQUEuIiwic3ViIjoiOWNiNTQxOWItNWZjYy00ZTQxLWE0YWUtMWVlMGVkYjQ1ODZiIiwidGlkIjoiOWEwODgyZmEtMGJiYy00Mjk4LThjYTEtNDVlYzM3MjMxYWIxIiwidXRpIjoiMVEtd2lhTFlIMHVsRmtkdndRbGFBQSIsInZlciI6IjIuMCIsImV4dGVuc2lvbl9PcmciOiJPQklBIn0.eUopCYBfB5OaBVZ5oUyptCGu5etLDRsuyRCTFNLZAmyZVqoJukk4DHXPEfPR-e4XSSCZ4ogYpyULMXHIiPYz9qzmG7iCtaWMCtEC1vD_VYbiy2U1kgHey3tvx3hi1n5Ari6I4XI7QhdRqeXE0NCeJ2o9S2TJqvxbzuWiyTxrzsAvD_kFlbFVoMDC3jQElampaElZg1TiiHLTUo8ubL0wUKA1KQ-xDCCsgKOGnsgmdo9lcqqKf_HXiQ0JDEFb_TYOfObp8T3a3bD0Pu5PHPTWEkbvdCgo0rNnYqE8asAykNtgIZ6B04lAsFDj4DD3t1l6hBE7q0Vf7LDbRbY5pGg2yw",
    },
  };
  //const fetchRequest = new ethers.FetchRequest(connectionInfo.url);
  //fetchRequest.setHeader("Authorization", "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IlhSdmtvOFA3QTNVYVdTblU3Yk05blQwTWpoQSJ9.eyJhdWQiOiIzOTYwYmNjZS1mMWZmLTQwNjYtOTAwOS1mZGJkOTE0ZmUxYzciLCJpc3MiOiJodHRwczovL2xvZ2luLm1pY3Jvc29mdG9ubGluZS5jb20vOWEwODgyZmEtMGJiYy00Mjk4LThjYTEtNDVlYzM3MjMxYWIxL3YyLjAiLCJpYXQiOjE3MTAyNjkxOTAsIm5iZiI6MTcxMDI2OTE5MCwiZXhwIjoxNzEwMjk4MjkwLCJhaW8iOiJBU1FBMi84V0FBQUFyMlY3dFB1ODQ2Y3FvVWpWdnlCOTBDL3c3NXRFTXlqWjVzMU1yWjd1OWlBPSIsImF6cCI6IjM5NjBiY2NlLWYxZmYtNDA2Ni05MDA5LWZkYmQ5MTRmZTFjNyIsImF6cGFjciI6IjEiLCJvaWQiOiI5Y2I1NDE5Yi01ZmNjLTRlNDEtYTRhZS0xZWUwZWRiNDU4NmIiLCJyaCI6IjAuQVJVQS1vSUltcndMbUVLTW9VWHNOeU1hc2M2OFlEbl84V1pBa0FuOXZaRlA0Y2NWQUFBLiIsInN1YiI6IjljYjU0MTliLTVmY2MtNGU0MS1hNGFlLTFlZTBlZGI0NTg2YiIsInRpZCI6IjlhMDg4MmZhLTBiYmMtNDI5OC04Y2ExLTQ1ZWMzNzIzMWFiMSIsInV0aSI6ImhyUXZKZTZJMGt1LU5mQVZsLXN5QUEiLCJ2ZXIiOiIyLjAiLCJleHRlbnNpb25fT3JnIjoiT0JJQSJ9.rLWSeRGzLhI_CefLDc9SUQQMEUV4H8a8k5qlJB6d-yfQ9-m2SKNk5NZw1KZVwHdjkb_DlzHuJ07aoCCBWax_IdK_nah08s0L9j1qp5yuo0q_ivG_Ewdbew4aoElnSkn02W_NXeTLiS6QZd1DlcuLvNZBTs_yhHhd2Hcr2TZtcdDOPKvxc66fH--UeyMhCa2S_vj2CxtcWNpfHuMxrAssMF7GO06bg6r2Ur6EIsHsSuqmrGd9iIodH4p9I0iCSVL5lSacarEcyEZJNZxfK1Nae0uopk4dnHln-tPoB0dNuQU86-BfgBGCmAbU8P3YD_rPU26LrGggaYEy_6xulOSRtw" )
  const provider = new ethers.JsonRpcProvider(connectionInfo.url);
  const signer = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider
  );

  const _foo = BigInt(1);
  const _salt = ethers.id("salt");

  const Factory = await new ethers.ContractFactory(
    factoryJSON.abi,
    factoryJSON.bytecode,
    signer
  );
  let factory = await Factory.deploy();
  factory = await factory.waitForDeployment();

  const factoryInstanceAddress = await factory.getAddress();
  console.log(`Factory deployed to ${factoryInstanceAddress}`);

  const factoryInsanceNonce = await provider.getTransactionCount(
    factoryInstanceAddress
  );
  const prosectiveCreateAddress = ethers.getCreateAddress({
    from: factoryInstanceAddress,
    nonce: factoryInsanceNonce,
  });
  const factoryInstance = new ethers.Contract(
    factoryInstanceAddress,
    factoryJSON.abi,
    signer
  );
  const contractEncodedArgs = new ethers.AbiCoder().encode(
    ["address", "uint"],
    [factoryInstanceAddress, _foo]
  );

  const encodedArgsNo0x = contractEncodedArgs.startsWith("0x")
    ? contractEncodedArgs.slice(2)
    : contractEncodedArgs;

  const combinedBytcodeAndArgs =
    testContractJson.bytecode.concat(encodedArgsNo0x);

  console.log({ contractEncodedArgs });
  console.log({ encodedArgsNo0x });
  console.log({ combinedBytcodeAndArgs });

  const _initCodeHash = ethers.keccak256(combinedBytcodeAndArgs);

  const prospectiveCreate2Address = ethers.getCreate2Address(
    factoryInstanceAddress,
    _salt,
    _initCodeHash
  );

  const txReceit: ethers.ContractTransactionResponse =
    await factoryInstance.create(factoryInstanceAddress, _foo);

  //console.log({ txReceit });
  const txR2 = await factoryInstance.create2(
    factoryInstanceAddress,
    _foo,
    _salt
  );

  console.log({ prosectiveCreateAddress });
  console.log({ prospectiveCreate2Address });
  console.log({ bytecode: combinedBytcodeAndArgs, _salt });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
