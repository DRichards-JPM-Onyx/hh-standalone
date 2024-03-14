// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
import "hardhat/console.sol";

import "./TestContract.sol";

contract Factory {
    TestContract[] public testContracts;

    function create2(
        address _owner,
        uint _foo,
        bytes32 _salt
    ) public payable returns (address) {
        TestContract testContract = (new TestContract){salt: _salt}(
            _owner,
            _foo
        );
        testContracts.push(testContract);
        console.log("testContract address: %s", address(testContract));
        return address(testContract);
    }
    function create(
        address _owner,
        uint _foo
    ) public payable returns (address) {
        TestContract testContract = new TestContract(_owner, _foo);
        testContracts.push(testContract);
        console.log("testContract address: %s", address(testContract));
        return address(testContract);
    }
}
