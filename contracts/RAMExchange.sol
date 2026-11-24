//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

import "./IRAMToken.sol";

// This is the main building block for smart contracts.
contract RAMExchange{

    address public admin;
    IRAMToken public immutable methods;
    uint256 public immutable rateWeiPerToken;
    uint256 public immutable tokenScale;
    uint256 public rateWei = 1000;

    event LiquidezDepositada(address indexed remetente, uint256 valor);
    event ExchangeRealizado(address indexed usuario, uint256 quantidadeRam, uint256 valorEth);

    modifier verificaAcessoAdmin() {
        require(msg.sender == admin, "voce nao pode chamar esse metodo");
        _;
    }

    // parametros passado no script de deploy
    constructor(address _ramTokenAddress, uint256 _rateWeiPerToken) payable {
        require(_ramTokenAddress != address(0), "Endereco do token invalido");
        require(_rateWeiPerToken > 0, "Taxa invalida");
        admin = msg.sender;
        methods = IRAMToken(_ramTokenAddress);
        rateWeiPerToken = _rateWeiPerToken;
        tokenScale = 10 ** uint256(methods.decimals());
    }

    // se precisar depositar mais eth para ajudar na liquidez, ver no deploy como fazer
    function depositarLiquidez() external payable verificaAcessoAdmin {
        require(msg.value > 0, "Valor de ETH invalido");
        emit LiquidezDepositada(msg.sender, msg.value);
    }

    function changeRamForETH(uint256 qtd) public {
        require(qtd > 0, "Quantia invalida");

        uint256 ethAmount = (qtd * rateWeiPerToken) / tokenScale;
        require(ethAmount > 0, "Valor em ETH invalido");

        require(address(this).balance >= ethAmount, "Liquidez insuficiente");
        require(
            methods.allowance(msg.sender, address(this)) >= qtd,
            "Allowance insuficiente: faca approve no RAMToken antes"
        );

        bool status = methods.transferFrom(msg.sender, address(this), qtd);
        require(status, "Nao foi possivel transferir os RAM's para o market");

        methods.burn(qtd);

        (bool sent, ) = payable(msg.sender).call{value: ethAmount}("");
        require(sent, "Falha ao enviar ETH para o usuario");

        emit ExchangeRealizado(msg.sender, qtd, ethAmount);
    }

}