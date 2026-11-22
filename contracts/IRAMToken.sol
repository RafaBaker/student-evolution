//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

interface IRAMToken {
    function decimals() external view returns (uint8);
    function balanceOf(address _owner) external view returns (uint256 balance);
    function allowance(address _owner, address _spender) external view returns (uint256 remaining);
    function approve(address _spender, uint256 _value) external returns (bool success);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool success);
    function burn(uint256 _value) external;
}