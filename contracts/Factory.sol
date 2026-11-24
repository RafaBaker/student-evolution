//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./Greeter.sol";

contract Factory {
    Greeter[] public GreeterArray;

    event GreeterCreated(uint256 indexed index, address indexed greeter);

    function CreateNewGreeter(string memory _greeting) public {
        Greeter greeter = new Greeter(_greeting);
        GreeterArray.push(greeter);
        emit GreeterCreated(GreeterArray.length - 1, address(greeter));
    }

    function gfSetter(uint256 _greeterIndex, string memory _greeting) public {
        Greeter(address(GreeterArray[_greeterIndex])).setGreeting(_greeting);
    }

    function gfGetter(
        uint256 _greeterIndex
    ) public view returns (string memory) {
        return Greeter(address(GreeterArray[_greeterIndex])).greet();
    }
}
