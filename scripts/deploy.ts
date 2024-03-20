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
import testContractJson from "../artifacts/contracts/TestContract.sol/TestContract.json";

async function main() {
  const BN_0 = BigInt(0);
  const BN_2 = BigInt(2);
  const BN_27 = BigInt(27);
  const BN_28 = BigInt(28);
  const BN_35 = BigInt(35);
  const BN_MAX_UINT = BigInt(
    "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  );

  const connectionInfo = {
    url: "http://localhost:8080/obi/api/v1/rpc",
    headers: {
      Authorization:
        "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IlhSdmtvOFA3QTNVYVdTblU3Yk05blQwTWpoQSJ9.eyJhdWQiOiIzOTYwYmNjZS1mMWZmLTQwNjYtOTAwOS1mZGJkOTE0ZmUxYzciLCJpc3MiOiJodHRwczovL2xvZ2luLm1pY3Jvc29mdG9ubGluZS5jb20vOWEwODgyZmEtMGJiYy00Mjk4LThjYTEtNDVlYzM3MjMxYWIxL3YyLjAiLCJpYXQiOjE3MTA1MzAxNDgsIm5iZiI6MTcxMDUzMDE0OCwiZXhwIjoxNzEwNTU5MjQ4LCJhaW8iOiJBU1FBMi84V0FBQUF2R1FoS2NNR3NRSERCK3VIcjNDVitmbDZaSmVrZTVSa2Q0UHZ1bkwzRXJjPSIsImF6cCI6IjM5NjBiY2NlLWYxZmYtNDA2Ni05MDA5LWZkYmQ5MTRmZTFjNyIsImF6cGFjciI6IjEiLCJvaWQiOiI5Y2I1NDE5Yi01ZmNjLTRlNDEtYTRhZS0xZWUwZWRiNDU4NmIiLCJyaCI6IjAuQVJVQS1vSUltcndMbUVLTW9VWHNOeU1hc2M2OFlEbl84V1pBa0FuOXZaRlA0Y2NWQUFBLiIsInN1YiI6IjljYjU0MTliLTVmY2MtNGU0MS1hNGFlLTFlZTBlZGI0NTg2YiIsInRpZCI6IjlhMDg4MmZhLTBiYmMtNDI5OC04Y2ExLTQ1ZWMzNzIzMWFiMSIsInV0aSI6IkFuRTFjbTNXRVVTT0RDOGZsOG9BQUEiLCJ2ZXIiOiIyLjAiLCJleHRlbnNpb25fT3JnIjoiT0JJQSJ9.ajQ-K__uXYGPI8Zkh3IeiYfbJu_GOazRNi4ZZfpr1VLC0788ri7pghwETU7fzCI4bvPgO1PD6AEjXSrXuRyjdT-qaAQR8vDGOLCpg5FQiL_sWtPqtSGkDh9l6uup9EbrVmnPP9d6rcbQpO3t7MCywwjXEB-raQxMOgebA1KzXMwEJTkKwdtU8B2408Saiv2EYI627Ghp3fxczJ61jEhGY0ufjxaiaqtG7CLUL_nFBqNStOD8F0HETCBRIlP_IMfl7qoKiaW5QpzoG497m_jZ4JP00LD9_15m83QJZrTFOEBal1pN6g503KaT5IM1fAJVG8-TR9iZQZ4MFI3Yp4Y-_g",
    },
  };
  const { chainId } = hre.network.config;
  const networkName = await hre.network.name;
  console.log({ networkName, chainId });
  const provider = await new ethers.JsonRpcProvider("http://127.0.0.1:8545/");

  const wallet = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider
  );

  const _foo = BigInt(1);
  const _salt = ethers.id("salt");

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

  const deserializedTx = ethers.Transaction.from(signedDeployTx); //from(signedDeployTx);

  console.log(`signedTx == null: ${signedDeployTx == null}`);
  console.log(`signedTx == string: ${typeof signedDeployTx == "string"}`);
  console.log(deserializedTx);

  const payload = ethers.getBytes(signedDeployTx);

  console.log({ payload });
  // switch (payload[0]) {
  //   case 1:
  //     return ethers.Transaction.from(_parseEip2930(payload));
  //   case 2:
  //     return ethers.Transaction.from(_parseEip1559(payload));
  //   case 3:
  //     return ethers.Transaction.from(_parseEip4844(payload));
  // }

  const parsedEip1599 = _parseEip1559(payload);
  console.log({ parsedEip1599 });

  const txFromPostParseEip1599 = ethers.Transaction.from(parsedEip1599);
  console.log({ txFromPostParseEip1599 });

  // const result = await hre.network.provider.send("eth_sendRawTransaction", [
  //   signedDeployTx,
  // ]);

  // console.log({ result });
  ///imports from ethers v6 ////

  function handleNumber(_value: string, param: string): number {
    if (_value === "0x") {
      return 0;
    }
    return getNumber(_value, param);
  }

  function handleUint(_value: string, param: string): bigint {
    if (_value === "0x") {
      return BN_0;
    }
    const value = getBigInt(_value, param);
    assertArgument(
      value <= BN_MAX_UINT,
      "value exceeds uint size",
      param,
      value
    );
    return value;
  }

  function handleAccessList(value: any, param: string): AccessList {
    try {
      return accessListify(value);
    } catch (error: any) {
      assertArgument(false, error.message, param, value);
    }
  }

  function handleAddress(value: string): null | string {
    if (value === "0x") {
      return null;
    }
    return getAddress(value);
  }

  function _parseEipSignature(
    tx: TransactionLike,
    fields: Array<string>
  ): void {
    let yParity: number;
    try {
      yParity = handleNumber(fields[0], "yParity");
      if (yParity !== 0 && yParity !== 1) {
        throw new Error("bad yParity");
      }
    } catch (error) {
      assertArgument(false, "invalid yParity", "yParity", fields[0]);
    }

    const r = zeroPadValue(fields[1], 32);
    const s = zeroPadValue(fields[2], 32);

    const signature = Signature.from({ r, s, yParity });
    tx.signature = signature;
  }

  ////////////////////////////////////////////////////////////////////////////

  // const txHash = await provider
  //   .send("eth_sendRawTransaction", [signedDeployTx])
  //   .catch((e) => console.log(`error in sending JRPC: ${e}`));
  // console.log({ txHash });

  // let factory = await Factory.deploy();
  // factory = await factory.waitForDeployment();

  // const factoryInstanceAddress = await factory.getAddress();
  // console.log(`Factory deployed to ${factoryInstanceAddress}`);

  // const factoryInsanceNonce = await provider.getTransactionCount(
  //   factoryInstanceAddress
  // );
  // const prosectiveCreateAddress = ethers.getCreateAddress({
  //   from: factoryInstanceAddress,
  //   nonce: factoryInsanceNonce,
  // });
  // const factoryInstance = new ethers.Contract(
  //   factoryInstanceAddress,
  //   factoryJSON.abi,
  //   signer
  // );
  // const contractEncodedArgs = new ethers.AbiCoder().encode(
  //   ["address", "uint"],
  //   [factoryInstanceAddress, _foo]
  // );

  // const encodedArgsNo0x = contractEncodedArgs.startsWith("0x")
  //   ? contractEncodedArgs.slice(2)
  //   : contractEncodedArgs;

  // const combinedBytcodeAndArgs =
  //   testContractJson.bytecode.concat(encodedArgsNo0x);

  // console.log({ contractEncodedArgs });
  // console.log({ encodedArgsNo0x });
  // console.log({ combinedBytcodeAndArgs });

  // const _initCodeHash = ethers.keccak256(combinedBytcodeAndArgs);

  // const prospectiveCreate2Address = ethers.getCreate2Address(
  //   factoryInstanceAddress,
  //   _salt,
  //   _initCodeHash
  // );

  // const txReceit: ethers.ContractTransactionResponse =
  //   await factoryInstance.create(factoryInstanceAddress, _foo);

  // //console.log({ txReceit });
  // const txR2 = await factoryInstance.create2(
  //   factoryInstanceAddress,
  //   _foo,
  //   _salt
  // );

  // console.log({ prosectiveCreateAddress });
  // console.log({ prospectiveCreate2Address });
  // console.log({ bytecode: combinedBytcodeAndArgs, _salt });
  function _parseEip2930(data: Uint8Array): TransactionLike {
    const fields: any = decodeRlp(getBytes(data).slice(1));

    assertArgument(
      Array.isArray(fields) && (fields.length === 8 || fields.length === 11),
      "invalid field count for transaction type: 1",
      "data",
      hexlify(data)
    );

    const tx: TransactionLike = {
      type: 1,
      chainId: handleUint(fields[0], "chainId"),
      nonce: handleNumber(fields[1], "nonce"),
      gasPrice: handleUint(fields[2], "gasPrice"),
      gasLimit: handleUint(fields[3], "gasLimit"),
      to: handleAddress(fields[4]),
      value: handleUint(fields[5], "value"),
      data: hexlify(fields[6]),
      accessList: handleAccessList(fields[7], "accessList"),
    };

    // Unsigned EIP-2930 Transaction
    if (fields.length === 8) {
      return tx;
    }

    tx.hash = keccak256(data);

    _parseEipSignature(tx, fields.slice(8));

    return tx;
  }
  function _parseEip1559(data: Uint8Array): TransactionLike {
    const fields: any = decodeRlp(getBytes(data).slice(1));

    assertArgument(
      Array.isArray(fields) && (fields.length === 9 || fields.length === 12),
      "invalid field count for transaction type: 2",
      "data",
      hexlify(data)
    );

    const tx: TransactionLike = {
      type: 2,
      chainId: handleUint(fields[0], "chainId"),
      nonce: handleNumber(fields[1], "nonce"),
      maxPriorityFeePerGas: handleUint(fields[2], "maxPriorityFeePerGas"),
      maxFeePerGas: handleUint(fields[3], "maxFeePerGas"),
      gasPrice: null,
      gasLimit: handleUint(fields[4], "gasLimit"),
      to: handleAddress(fields[5]),
      value: handleUint(fields[6], "value"),
      data: hexlify(fields[7]),
      accessList: handleAccessList(fields[8], "accessList"),
    };

    // Unsigned EIP-1559 Transaction
    if (fields.length === 9) {
      return tx;
    }

    tx.hash = keccak256(data);

    _parseEipSignature(tx, fields.slice(9));

    return tx;
  }
  function _parseEip4844(data: Uint8Array): TransactionLike {
    const fields: any = decodeRlp(getBytes(data).slice(1));

    assertArgument(
      Array.isArray(fields) && (fields.length === 11 || fields.length === 14),
      "invalid field count for transaction type: 3",
      "data",
      hexlify(data)
    );

    const tx: TransactionLike = {
      type: 3,
      chainId: handleUint(fields[0], "chainId"),
      nonce: handleNumber(fields[1], "nonce"),
      maxPriorityFeePerGas: handleUint(fields[2], "maxPriorityFeePerGas"),
      maxFeePerGas: handleUint(fields[3], "maxFeePerGas"),
      gasPrice: null,
      gasLimit: handleUint(fields[4], "gasLimit"),
      to: handleAddress(fields[5]),
      value: handleUint(fields[6], "value"),
      data: hexlify(fields[7]),
      accessList: handleAccessList(fields[8], "accessList"),
      maxFeePerBlobGas: handleUint(fields[9], "maxFeePerBlobGas"),
      blobVersionedHashes: fields[10],
    };

    assertArgument(
      tx.to != null,
      "invalid address for transaction type: 3",
      "data",
      data
    );

    assertArgument(
      Array.isArray(tx.blobVersionedHashes),
      "invalid blobVersionedHashes: must be an array",
      "data",
      data
    );
    for (let i = 0; i < tx.blobVersionedHashes.length; i++) {
      assertArgument(
        isHexString(tx.blobVersionedHashes[i], 32),
        `invalid blobVersionedHash at index ${i}: must be length 32`,
        "data",
        data
      );
    }

    // Unsigned EIP-4844 Transaction
    if (fields.length === 11) {
      return tx;
    }

    tx.hash = keccak256(data);

    _parseEipSignature(tx, fields.slice(11));

    return tx;
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
