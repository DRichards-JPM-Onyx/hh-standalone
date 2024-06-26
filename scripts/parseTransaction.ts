import {
  AccessList,
  AccessListish,
  BigNumberish,
  BytesLike,
  Signature,
  SignatureLike,
  SigningKey,
  TransactionLike,
  ZeroAddress,
  accessListify,
  assert,
  assertArgument,
  concat,
  decodeRlp,
  encodeRlp,
  ethers,
  getAddress,
  getBigInt,
  getBytes,
  getNumber,
  hexlify,
  isHexString,
  keccak256,
  recoverAddress,
  toBeArray,
  zeroPadValue,
} from "ethers";

import hre from "hardhat";
import factoryJSON from "../artifacts/contracts/Factory.sol/Factory.json";

const BN_0 = BigInt(0);
const BN_2 = BigInt(2);
const BN_27 = BigInt(27);
const BN_28 = BigInt(28);
const BN_35 = BigInt(35);
const BN_MAX_UINT = BigInt(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);

function handleAddress(value: string): null | string {
  if (value === "0x") {
    return null;
  }
  return getAddress(value);
}

function handleAccessList(value: any, param: string): AccessList {
  try {
    return accessListify(value);
  } catch (error: any) {
    assertArgument(false, error.message, param, value);
  }
}

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
  assertArgument(value <= BN_MAX_UINT, "value exceeds uint size", param, value);
  return value;
}

function formatNumber(_value: BigNumberish, name: string): Uint8Array {
  const value = getBigInt(_value, "value");
  const result = toBeArray(value);
  assertArgument(result.length <= 32, `value too large`, `tx.${name}`, value);
  return result;
}

function formatAccessList(
  value: AccessListish
): Array<[string, Array<string>]> {
  return accessListify(value).map((set) => [set.address, set.storageKeys]);
}

function formatHashes(value: Array<string>, param: string): Array<string> {
  assertArgument(Array.isArray(value), `invalid ${param}`, "value", value);
  for (let i = 0; i < value.length; i++) {
    assertArgument(
      isHexString(value[i], 32),
      "invalid ${ param } hash",
      `value[${i}]`,
      value[i]
    );
  }
  return value;
}

function _parseLegacy(data: Uint8Array): TransactionLike {
  const fields: any = decodeRlp(data);

  assertArgument(
    Array.isArray(fields) && (fields.length === 9 || fields.length === 6),
    "invalid field count for legacy transaction",
    "data",
    data
  );

  const tx: TransactionLike = {
    type: 0,
    nonce: handleNumber(fields[0], "nonce"),
    gasPrice: handleUint(fields[1], "gasPrice"),
    gasLimit: handleUint(fields[2], "gasLimit"),
    to: handleAddress(fields[3]),
    value: handleUint(fields[4], "value"),
    data: hexlify(fields[5]),
    chainId: BN_0,
  };

  // Legacy unsigned transaction
  if (fields.length === 6) {
    return tx;
  }

  const v = handleUint(fields[6], "v");
  const r = handleUint(fields[7], "r");
  const s = handleUint(fields[8], "s");

  if (r === BN_0 && s === BN_0) {
    // EIP-155 unsigned transaction
    tx.chainId = v;
  } else {
    // Compute the EIP-155 chain ID (or 0 for legacy)
    let chainId = (v - BN_35) / BN_2;
    if (chainId < BN_0) {
      chainId = BN_0;
    }
    tx.chainId = chainId;

    // Signed Legacy Transaction
    assertArgument(
      chainId !== BN_0 || v === BN_27 || v === BN_28,
      "non-canonical legacy v",
      "v",
      fields[6]
    );

    tx.signature = Signature.from({
      r: zeroPadValue(fields[7], 32),
      s: zeroPadValue(fields[8], 32),
      v,
    });

    tx.hash = keccak256(data);
  }

  return tx;
}

function _serializeLegacy(tx: Transaction, sig?: Signature): string {
  const fields: Array<any> = [
    formatNumber(tx.nonce, "nonce"),
    formatNumber(tx.gasPrice || 0, "gasPrice"),
    formatNumber(tx.gasLimit, "gasLimit"),
    tx.to || "0x",
    formatNumber(tx.value, "value"),
    tx.data,
  ];

  let chainId = BN_0;
  if (tx.chainId != BN_0) {
    // A chainId was provided; if non-zero we'll use EIP-155
    chainId = getBigInt(tx.chainId, "tx.chainId");

    // We have a chainId in the tx and an EIP-155 v in the signature,
    // make sure they agree with each other
    assertArgument(
      !sig || sig.networkV == null || sig.legacyChainId === chainId,
      "tx.chainId/sig.v mismatch",
      "sig",
      sig
    );
  } else if (tx.signature) {
    // No explicit chainId, but EIP-155 have a derived implicit chainId
    const legacy = tx.signature.legacyChainId;
    if (legacy != null) {
      chainId = legacy;
    }
  }

  // Requesting an unsigned transaction
  if (!sig) {
    // We have an EIP-155 transaction (chainId was specified and non-zero)
    if (chainId !== BN_0) {
      fields.push(toBeArray(chainId));
      fields.push("0x");
      fields.push("0x");
    }

    return encodeRlp(fields);
  }

  // @TODO: We should probably check that tx.signature, chainId, and sig
  //        match but that logic could break existing code, so schedule
  //        this for the next major bump.

  // Compute the EIP-155 v
  let v = BigInt(27 + sig.yParity);
  if (chainId !== BN_0) {
    v = Signature.getChainIdV(chainId, sig.v);
  } else if (BigInt(sig.v) !== v) {
    assertArgument(false, "tx.chainId/sig.v mismatch", "sig", sig);
  }

  // Add the signature
  fields.push(toBeArray(v));
  fields.push(toBeArray(sig.r));
  fields.push(toBeArray(sig.s));

  return encodeRlp(fields);
}

function _parseEipSignature(tx: TransactionLike, fields: Array<string>): void {
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

function _serializeEip1559(tx: Transaction, sig?: Signature): string {
  const fields: Array<any> = [
    formatNumber(tx.chainId, "chainId"),
    formatNumber(tx.nonce, "nonce"),
    formatNumber(tx.maxPriorityFeePerGas || 0, "maxPriorityFeePerGas"),
    formatNumber(tx.maxFeePerGas || 0, "maxFeePerGas"),
    formatNumber(tx.gasLimit, "gasLimit"),
    tx.to || "0x",
    formatNumber(tx.value, "value"),
    tx.data,
    formatAccessList(tx.accessList || []),
  ];

  if (sig) {
    fields.push(formatNumber(sig.yParity, "yParity"));
    fields.push(toBeArray(sig.r));
    fields.push(toBeArray(sig.s));
  }

  return concat(["0x02", encodeRlp(fields)]);
}

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

function _serializeEip2930(tx: Transaction, sig?: Signature): string {
  const fields: any = [
    formatNumber(tx.chainId, "chainId"),
    formatNumber(tx.nonce, "nonce"),
    formatNumber(tx.gasPrice || 0, "gasPrice"),
    formatNumber(tx.gasLimit, "gasLimit"),
    tx.to || "0x",
    formatNumber(tx.value, "value"),
    tx.data,
    formatAccessList(tx.accessList || []),
  ];

  if (sig) {
    fields.push(formatNumber(sig.yParity, "recoveryParam"));
    fields.push(toBeArray(sig.r));
    fields.push(toBeArray(sig.s));
  }

  return concat(["0x01", encodeRlp(fields)]);
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

function _serializeEip4844(tx: Transaction, sig?: Signature): string {
  const fields: Array<any> = [
    formatNumber(tx.chainId, "chainId"),
    formatNumber(tx.nonce, "nonce"),
    formatNumber(tx.maxPriorityFeePerGas || 0, "maxPriorityFeePerGas"),
    formatNumber(tx.maxFeePerGas || 0, "maxFeePerGas"),
    formatNumber(tx.gasLimit, "gasLimit"),
    tx.to || ZeroAddress,
    formatNumber(tx.value, "value"),
    tx.data,
    formatAccessList(tx.accessList || []),
    formatNumber(tx.maxFeePerBlobGas || 0, "maxFeePerBlobGas"),
    formatHashes(tx.blobVersionedHashes || [], "blobVersionedHashes"),
  ];

  if (sig) {
    fields.push(formatNumber(sig.yParity, "yParity"));
    fields.push(toBeArray(sig.r));
    fields.push(toBeArray(sig.s));
  }

  return concat(["0x03", encodeRlp(fields)]);
}

/**
 *  A **Transaction** describes an operation to be executed on
 *  Ethereum by an Externally Owned Account (EOA). It includes
 *  who (the [[to]] address), what (the [[data]]) and how much (the
 *  [[value]] in ether) the operation should entail.
 *
 *  @example:
 *    tx = new Transaction()
 *    //_result:
 *
 *    tx.data = "0x1234";
 *    //_result:
 */
export class Transaction implements TransactionLike<string> {
  #type: null | number;
  #to: null | string;
  #data: string;
  #nonce: number;
  #gasLimit: bigint;
  #gasPrice: null | bigint;
  #maxPriorityFeePerGas: null | bigint;
  #maxFeePerGas: null | bigint;
  #value: bigint;
  #chainId: bigint;
  #sig: null | Signature;
  #accessList: null | AccessList;
  #maxFeePerBlobGas: null | bigint;
  #blobVersionedHashes: null | Array<string>;

  /**
   *  The transaction type.
   *
   *  If null, the type will be automatically inferred based on
   *  explicit properties.
   */
  get type(): null | number {
    return this.#type;
  }
  set type(value: null | number | string) {
    switch (value) {
      case null:
        this.#type = null;
        break;
      case 0:
      case "legacy":
        this.#type = 0;
        break;
      case 1:
      case "berlin":
      case "eip-2930":
        this.#type = 1;
        break;
      case 2:
      case "london":
      case "eip-1559":
        this.#type = 2;
        break;
      case 3:
      case "cancun":
      case "eip-4844":
        this.#type = 3;
        break;
      default:
        assertArgument(false, "unsupported transaction type", "type", value);
    }
  }

  /**
   *  The name of the transaction type.
   */
  get typeName(): null | string {
    switch (this.type) {
      case 0:
        return "legacy";
      case 1:
        return "eip-2930";
      case 2:
        return "eip-1559";
      case 3:
        return "eip-4844";
    }

    return null;
  }

  /**
   *  The ``to`` address for the transaction or ``null`` if the
   *  transaction is an ``init`` transaction.
   */
  get to(): null | string {
    const value = this.#to;
    if (value == null && this.type === 3) {
      return ZeroAddress;
    }
    return value;
  }
  set to(value: null | string) {
    this.#to = value == null ? null : getAddress(value);
  }

  /**
   *  The transaction nonce.
   */
  get nonce(): number {
    return this.#nonce;
  }
  set nonce(value: BigNumberish) {
    this.#nonce = getNumber(value, "value");
  }

  /**
   *  The gas limit.
   */
  get gasLimit(): bigint {
    return this.#gasLimit;
  }
  set gasLimit(value: BigNumberish) {
    this.#gasLimit = getBigInt(value);
  }

  /**
   *  The gas price.
   *
   *  On legacy networks this defines the fee that will be paid. On
   *  EIP-1559 networks, this should be ``null``.
   */
  get gasPrice(): null | bigint {
    const value = this.#gasPrice;
    if (value == null && (this.type === 0 || this.type === 1)) {
      return BN_0;
    }
    return value;
  }
  set gasPrice(value: null | BigNumberish) {
    this.#gasPrice = value == null ? null : getBigInt(value, "gasPrice");
  }

  /**
   *  The maximum priority fee per unit of gas to pay. On legacy
   *  networks this should be ``null``.
   */
  get maxPriorityFeePerGas(): null | bigint {
    const value = this.#maxPriorityFeePerGas;
    if (value == null) {
      if (this.type === 2 || this.type === 3) {
        return BN_0;
      }
      return null;
    }
    return value;
  }
  set maxPriorityFeePerGas(value: null | BigNumberish) {
    this.#maxPriorityFeePerGas =
      value == null ? null : getBigInt(value, "maxPriorityFeePerGas");
  }

  /**
   *  The maximum total fee per unit of gas to pay. On legacy
   *  networks this should be ``null``.
   */
  get maxFeePerGas(): null | bigint {
    const value = this.#maxFeePerGas;
    if (value == null) {
      if (this.type === 2 || this.type === 3) {
        return BN_0;
      }
      return null;
    }
    return value;
  }
  set maxFeePerGas(value: null | BigNumberish) {
    this.#maxFeePerGas =
      value == null ? null : getBigInt(value, "maxFeePerGas");
  }

  /**
   *  The transaction data. For ``init`` transactions this is the
   *  deployment code.
   */
  get data(): string {
    return this.#data;
  }
  set data(value: BytesLike) {
    this.#data = hexlify(value);
  }

  /**
   *  The amount of ether (in wei) to send in this transactions.
   */
  get value(): bigint {
    return this.#value;
  }
  set value(value: BigNumberish) {
    this.#value = getBigInt(value, "value");
  }

  /**
   *  The chain ID this transaction is valid on.
   */
  get chainId(): bigint {
    return this.#chainId;
  }
  set chainId(value: BigNumberish) {
    this.#chainId = getBigInt(value);
  }

  /**
   *  If signed, the signature for this transaction.
   */
  get signature(): null | Signature {
    return this.#sig || null;
  }
  set signature(value: null | SignatureLike) {
    this.#sig = value == null ? null : Signature.from(value);
  }

  /**
   *  The access list.
   *
   *  An access list permits discounted (but pre-paid) access to
   *  bytecode and state variable access within contract execution.
   */
  get accessList(): null | AccessList {
    const value = this.#accessList || null;
    if (value == null) {
      if (this.type === 1 || this.type === 2 || this.type === 3) {
        // @TODO: in v7, this should assign the value or become
        // a live object itself, otherwise mutation is inconsistent
        return [];
      }
      return null;
    }
    return value;
  }
  set accessList(value: null | AccessListish) {
    this.#accessList = value == null ? null : accessListify(value);
  }

  /**
   *  The max fee per blob gas for Cancun transactions.
   */
  get maxFeePerBlobGas(): null | bigint {
    const value = this.#maxFeePerBlobGas;
    if (value == null && this.type === 3) {
      return BN_0;
    }
    return value;
  }
  set maxFeePerBlobGas(value: null | BigNumberish) {
    this.#maxFeePerBlobGas =
      value == null ? null : getBigInt(value, "maxFeePerBlobGas");
  }

  /**
   *  The BLOB versioned hashes for Cancun transactions.
   */
  get blobVersionedHashes(): null | Array<string> {
    // @TODO: Mutation is inconsistent; if unset, the returned value
    // cannot mutate the object, if set it can
    let value = this.#blobVersionedHashes;
    if (value == null && this.type === 3) {
      return [];
    }
    return value;
  }
  set blobVersionedHashes(value: null | Array<string>) {
    if (value != null) {
      assertArgument(
        Array.isArray(value),
        "blobVersionedHashes must be an Array",
        "value",
        value
      );
      value = value.slice();
      for (let i = 0; i < value.length; i++) {
        assertArgument(
          isHexString(value[i], 32),
          "invalid blobVersionedHash",
          `value[${i}]`,
          value[i]
        );
      }
    }
    this.#blobVersionedHashes = value;
  }

  /**
   *  Creates a new Transaction with default values.
   */
  constructor() {
    this.#type = null;
    this.#to = null;
    this.#nonce = 0;
    this.#gasLimit = BN_0;
    this.#gasPrice = null;
    this.#maxPriorityFeePerGas = null;
    this.#maxFeePerGas = null;
    this.#data = "0x";
    this.#value = BN_0;
    this.#chainId = BN_0;
    this.#sig = null;
    this.#accessList = null;
    this.#maxFeePerBlobGas = null;
    this.#blobVersionedHashes = null;
  }

  /**
   *  The transaction hash, if signed. Otherwise, ``null``.
   */
  get hash(): null | string {
    if (this.signature == null) {
      return null;
    }
    return keccak256(this.serialized);
  }

  /**
   *  The pre-image hash of this transaction.
   *
   *  This is the digest that a [[Signer]] must sign to authorize
   *  this transaction.
   */
  get unsignedHash(): string {
    return keccak256(this.unsignedSerialized);
  }

  /**
   *  The sending address, if signed. Otherwise, ``null``.
   */
  get from(): null | string {
    if (this.signature == null) {
      return null;
    }
    return recoverAddress(this.unsignedHash, this.signature);
  }

  /**
   *  The public key of the sender, if signed. Otherwise, ``null``.
   */
  get fromPublicKey(): null | string {
    if (this.signature == null) {
      return null;
    }
    return SigningKey.recoverPublicKey(this.unsignedHash, this.signature);
  }

  /**
   *  Returns true if signed.
   *
   *  This provides a Type Guard that properties requiring a signed
   *  transaction are non-null.
   */
  isSigned(): this is Transaction & {
    type: number;
    typeName: string;
    from: string;
    signature: Signature;
  } {
    return this.signature != null;
  }

  /**
   *  The serialized transaction.
   *
   *  This throws if the transaction is unsigned. For the pre-image,
   *  use [[unsignedSerialized]].
   */
  get serialized(): string {
    assert(
      this.signature != null,
      "cannot serialize unsigned transaction; maybe you meant .unsignedSerialized",
      "UNSUPPORTED_OPERATION",
      { operation: ".serialized" }
    );

    switch (this.inferType()) {
      case 0:
        return _serializeLegacy(this, this.signature);
      case 1:
        return _serializeEip2930(this, this.signature);
      case 2:
        return _serializeEip1559(this, this.signature);
      case 3:
        return _serializeEip4844(this, this.signature);
    }

    assert(false, "unsupported transaction type", "UNSUPPORTED_OPERATION", {
      operation: ".serialized",
    });
  }

  /**
   *  The transaction pre-image.
   *
   *  The hash of this is the digest which needs to be signed to
   *  authorize this transaction.
   */
  get unsignedSerialized(): string {
    switch (this.inferType()) {
      case 0:
        return _serializeLegacy(this);
      case 1:
        return _serializeEip2930(this);
      case 2:
        return _serializeEip1559(this);
      case 3:
        return _serializeEip4844(this);
    }

    assert(false, "unsupported transaction type", "UNSUPPORTED_OPERATION", {
      operation: ".unsignedSerialized",
    });
  }

  /**
   *  Return the most "likely" type; currently the highest
   *  supported transaction type.
   */
  inferType(): number {
    const types = this.inferTypes();

    // Prefer London (EIP-1559) over Cancun (BLOb)
    if (types.indexOf(2) >= 0) {
      return 2;
    }

    // Return the highest inferred type
    return <number>types.pop();
  }

  /**
   *  Validates the explicit properties and returns a list of compatible
   *  transaction types.
   */
  inferTypes(): Array<number> {
    // Checks that there are no conflicting properties set
    const hasGasPrice = this.gasPrice != null;
    const hasFee =
      this.maxFeePerGas != null || this.maxPriorityFeePerGas != null;
    const hasAccessList = this.accessList != null;
    const hasBlob = this.#maxFeePerBlobGas != null || this.#blobVersionedHashes;

    //if (hasGasPrice && hasFee) {
    //    throw new Error("transaction cannot have gasPrice and maxFeePerGas");
    //}

    if (this.maxFeePerGas != null && this.maxPriorityFeePerGas != null) {
      assert(
        this.maxFeePerGas >= this.maxPriorityFeePerGas,
        "priorityFee cannot be more than maxFee",
        "BAD_DATA",
        { value: this }
      );
    }

    //if (this.type === 2 && hasGasPrice) {
    //    throw new Error("eip-1559 transaction cannot have gasPrice");
    //}

    assert(
      !hasFee || (this.type !== 0 && this.type !== 1),
      "transaction type cannot have maxFeePerGas or maxPriorityFeePerGas",
      "BAD_DATA",
      { value: this }
    );
    assert(
      this.type !== 0 || !hasAccessList,
      "legacy transaction cannot have accessList",
      "BAD_DATA",
      { value: this }
    );

    const types: Array<number> = [];

    // Explicit type
    if (this.type != null) {
      types.push(this.type);
    } else {
      if (hasFee) {
        types.push(2);
      } else if (hasGasPrice) {
        types.push(1);
        if (!hasAccessList) {
          types.push(0);
        }
      } else if (hasAccessList) {
        types.push(1);
        types.push(2);
      } else if (hasBlob && this.to) {
        types.push(3);
      } else {
        types.push(0);
        types.push(1);
        types.push(2);
        types.push(3);
      }
    }

    types.sort();

    return types;
  }

  /**
   *  Returns true if this transaction is a legacy transaction (i.e.
   *  ``type === 0``).
   *
   *  This provides a Type Guard that the related properties are
   *  non-null.
   */
  isLegacy(): this is Transaction & { type: 0; gasPrice: bigint } {
    return this.type === 0;
  }

  /**
   *  Returns true if this transaction is berlin hardform transaction (i.e.
   *  ``type === 1``).
   *
   *  This provides a Type Guard that the related properties are
   *  non-null.
   */
  isBerlin(): this is Transaction & {
    type: 1;
    gasPrice: bigint;
    accessList: AccessList;
  } {
    return this.type === 1;
  }

  /**
   *  Returns true if this transaction is london hardform transaction (i.e.
   *  ``type === 2``).
   *
   *  This provides a Type Guard that the related properties are
   *  non-null.
   */
  isLondon(): this is Transaction & {
    type: 2;
    accessList: AccessList;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  } {
    return this.type === 2;
  }

  /**
   *  Returns true if this transaction is an [[link-eip-4844]] BLOB
   *  transaction.
   *
   *  This provides a Type Guard that the related properties are
   *  non-null.
   */
  isCancun(): this is Transaction & {
    type: 3;
    to: string;
    accessList: AccessList;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    maxFeePerBlobGas: bigint;
    blobVersionedHashes: Array<string>;
  } {
    return this.type === 3;
  }

  /**
   *  Create a copy of this transaciton.
   */
  clone(): Transaction {
    return Transaction.from(this);
  }

  /**
   *  Return a JSON-friendly object.
   */
  toJSON(): any {
    const s = (v: null | bigint) => {
      if (v == null) {
        return null;
      }
      return v.toString();
    };

    return {
      type: this.type,
      to: this.to,
      //            from: this.from,
      data: this.data,
      nonce: this.nonce,
      gasLimit: s(this.gasLimit),
      gasPrice: s(this.gasPrice),
      maxPriorityFeePerGas: s(this.maxPriorityFeePerGas),
      maxFeePerGas: s(this.maxFeePerGas),
      value: s(this.value),
      chainId: s(this.chainId),
      sig: this.signature ? this.signature.toJSON() : null,
      accessList: this.accessList,
    };
  }

  /**
   *  Create a **Transaction** from a serialized transaction or a
   *  Transaction-like object.
   */
  static from(tx?: string | TransactionLike<string>): Transaction {
    if (tx == null) {
      return new Transaction();
    }

    if (typeof tx === "string") {
      const payload = getBytes(tx);

      if (payload[0] >= 0x7f) {
        // @TODO: > vs >= ??
        return Transaction.from(_parseLegacy(payload));
      }

      switch (payload[0]) {
        case 1:
          console.log("****IN CASE 1******");
          return Transaction.from(_parseEip2930(payload));
        case 2:
          let tx = _parseEip1559(payload);
          console.log("****IN CASE 2******");
          return Transaction.from(tx);
        case 3:
          return Transaction.from(_parseEip4844(payload));
        default:
          assert(
            false,
            "unsupported transaction type",
            "UNSUPPORTED_OPERATION",
            {
              operation: "from",
            }
          );
      }
    }
    console.log({ tx });
    console.log(Object.keys(tx));
    console.log(`************************************************************`);
    const result = new Transaction();
    if (tx.type != null) {
      console.log("changing type");
      result.type = tx.type;
      console.log(result.type);
    }
    if (tx.to != null) {
      result.to = tx.to;
    }
    if (tx.nonce != null) {
      result.nonce = tx.nonce;
    }
    if (tx.gasLimit != null) {
      result.gasLimit = tx.gasLimit;
    }
    if (tx.gasPrice != null) {
      result.gasPrice = tx.gasPrice;
    }
    if (tx.maxPriorityFeePerGas != null) {
      result.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
    }
    if (tx.maxFeePerGas != null) {
      result.maxFeePerGas = tx.maxFeePerGas;
    }
    if (tx.maxFeePerBlobGas != null) {
      result.maxFeePerBlobGas = tx.maxFeePerBlobGas;
    }
    if (tx.data != null) {
      result.data = tx.data;
    }
    if (tx.value != null) {
      result.value = tx.value;
    }
    if (tx.chainId != null) {
      result.chainId = tx.chainId;
    }
    if (tx.signature != null) {
      result.signature = Signature.from(tx.signature);
    }
    if (tx.accessList != null) {
      result.accessList = tx.accessList;
    }
    if (tx.blobVersionedHashes != null) {
      result.blobVersionedHashes = tx.blobVersionedHashes;
    }

    if (tx.hash != null) {
      assertArgument(
        result.isSigned(),
        "unsigned transaction cannot define hash",
        "tx",
        tx
      );
      assertArgument(result.hash === tx.hash, "hash mismatch", "tx", tx);
    }

    if (tx.from != null) {
      assertArgument(
        result.isSigned(),
        "unsigned transaction cannot define from",
        "tx",
        tx
      );
      assertArgument(
        result.from.toLowerCase() === (tx.from || "").toLowerCase(),
        "from mismatch",
        "tx",
        tx
      );
    }
    console.log({ result });
    return result;
  }
}

async function main() {
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
  console.log({ from: deserializedTx.from });

  //   const payload = ethers.getBytes(signedDeployTx);

  //   console.log({ payload });
  //   const parsedEip1599 = _parseEip1559(payload);
  //   console.log({ parsedEip1599 });

  //   const txFromPostParseEip1599 = ethers.Transaction.from(parsedEip1599);
  //   console.log({ txFromPostParseEip1599 });

  // switch (payload[0]) {
  //   case 1:
  //     return ethers.Transaction.from(_parseEip2930(payload));
  //   case 2:
  //     return ethers.Transaction.from(_parseEip1559(payload));
  //   case 3:
  //     return ethers.Transaction.from(_parseEip4844(payload));
  // }

  // const result = await hre.network.provider.send("eth_sendRawTransaction", [
  //   signedDeployTx,
  // ]);

  // console.log({ result });
  ///imports from ethers v6 ////

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
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
