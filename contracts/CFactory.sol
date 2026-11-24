// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/proxy/Clones.sol";


contract CFactory {

    adress public template;
    event CloneCreated(adress indexed clone);

    constructor() {
        template = address(new Classroom());
    }

    function createClone(uint256 initialData_) external {
        address clone = Clones.clone(template);
        clone.initialize(initialData_);
        emit CloneCreated(clone);
    }

}