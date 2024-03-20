import { ethers } from "ethers";

import factoryJSON from "../artifacts/contracts/Factory.sol/Factory.json";
import testContractJson from "../artifacts/contracts/TestContract.sol/TestContract.json";

async function main() {
  const connectionInfo = {
    url: "http://localhost:8080/obi/api/v1/rpc",
    headers: {
      Authorization:
        "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IlhSdmtvOFA3QTNVYVdTblU3Yk05blQwTWpoQSJ9.eyJhdWQiOiIzOTYwYmNjZS1mMWZmLTQwNjYtOTAwOS1mZGJkOTE0ZmUxYzciLCJpc3MiOiJodHRwczovL2xvZ2luLm1pY3Jvc29mdG9ubGluZS5jb20vOWEwODgyZmEtMGJiYy00Mjk4LThjYTEtNDVlYzM3MjMxYWIxL3YyLjAiLCJpYXQiOjE3MTA1MzAxNDgsIm5iZiI6MTcxMDUzMDE0OCwiZXhwIjoxNzEwNTU5MjQ4LCJhaW8iOiJBU1FBMi84V0FBQUF2R1FoS2NNR3NRSERCK3VIcjNDVitmbDZaSmVrZTVSa2Q0UHZ1bkwzRXJjPSIsImF6cCI6IjM5NjBiY2NlLWYxZmYtNDA2Ni05MDA5LWZkYmQ5MTRmZTFjNyIsImF6cGFjciI6IjEiLCJvaWQiOiI5Y2I1NDE5Yi01ZmNjLTRlNDEtYTRhZS0xZWUwZWRiNDU4NmIiLCJyaCI6IjAuQVJVQS1vSUltcndMbUVLTW9VWHNOeU1hc2M2OFlEbl84V1pBa0FuOXZaRlA0Y2NWQUFBLiIsInN1YiI6IjljYjU0MTliLTVmY2MtNGU0MS1hNGFlLTFlZTBlZGI0NTg2YiIsInRpZCI6IjlhMDg4MmZhLTBiYmMtNDI5OC04Y2ExLTQ1ZWMzNzIzMWFiMSIsInV0aSI6IkFuRTFjbTNXRVVTT0RDOGZsOG9BQUEiLCJ2ZXIiOiIyLjAiLCJleHRlbnNpb25fT3JnIjoiT0JJQSJ9.ajQ-K__uXYGPI8Zkh3IeiYfbJu_GOazRNi4ZZfpr1VLC0788ri7pghwETU7fzCI4bvPgO1PD6AEjXSrXuRyjdT-qaAQR8vDGOLCpg5FQiL_sWtPqtSGkDh9l6uup9EbrVmnPP9d6rcbQpO3t7MCywwjXEB-raQxMOgebA1KzXMwEJTkKwdtU8B2408Saiv2EYI627Ghp3fxczJ61jEhGY0ufjxaiaqtG7CLUL_nFBqNStOD8F0HETCBRIlP_IMfl7qoKiaW5QpzoG497m_jZ4JP00LD9_15m83QJZrTFOEBal1pN6g503KaT5IM1fAJVG8-TR9iZQZ4MFI3Yp4Y-_g",
    },
  };
  const fetchRequest = new ethers.FetchRequest(connectionInfo.url);
  fetchRequest.setHeader(
    Object.keys(connectionInfo.headers)[0],
    connectionInfo.headers.Authorization
  );
  const provider = new ethers.JsonRpcProvider(fetchRequest);
  const signer = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    provider
  );

  const _foo = BigInt(1);
  const _salt = ethers.id("salt");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
