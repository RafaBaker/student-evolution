// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/proxy/Clones.sol";

contract Classroom {
    uint private id;

    constructor() {
        _disableInitializers();
    }

    function initialize(uint256 _id) external initializer {
        id = _id;
    }
}
