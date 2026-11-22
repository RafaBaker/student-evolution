//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

// This is the main building block for smart contracts.
contract RAMToken is ERC20, ERC20Burnable {

    address public admin;

    mapping(address => bool) public salasAutorizadas;

    modifier verificaAcessoAdmin(){
        require(msg.sender == admin, "voce nao pode chamar esse metodo");
        _;
    }

    modifier verificaAcessoSala(){
        require(salasAutorizadas[msg.sender], "voce nao pode chamar esse metodo");
        _;
    }

    constructor() ERC20("RAMToken", "RAM"){
        admin = msg.sender;
    }

    function setSalasAutorizadas(address sala, bool status) public verificaAcessoAdmin(){
        require(sala != address(0), "Sala invalida");
        salasAutorizadas[sala] = status;
    }

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    function issueToken(address destinatario, uint256 qtd) public verificaAcessoSala(){
        require(destinatario != address(0), "Destinatario invalido");
        require(qtd > 0, "Quantia invalida");
        _mint(destinatario, qtd);
    }

}