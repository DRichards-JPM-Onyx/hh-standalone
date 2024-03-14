// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
contract TestContract {
    address public owner;
    uint public foo;

    constructor(address _owner, uint _foo) {
        owner = _owner;
        foo = _foo;
    }

    function changeFoo(uint _foo) public {
        foo = _foo;
    }
}
