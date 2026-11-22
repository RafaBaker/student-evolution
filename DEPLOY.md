# Guia de Deploy — RAMToken e RAMExchange

Este guia explica como fazer o deploy dos contratos `RAMToken` e `RAMExchange` usando **Hardhat 3 + viem**, tanto em ambiente local quanto na rede de testes **Sepolia**.

> **Sobre o `IRAMToken`**: `contracts/IRAMToken.sol` é apenas uma `interface` Solidity utilizada pelo `RAMExchange` para se comunicar com o `RAMToken`. Interfaces não geram bytecode e não são deployadas na blockchain.

---

## Pré-requisitos

Instale as dependências e compile os contratos antes do primeiro deploy:

```bash
npm install
npm run build
```

---

## 1. Deploy Local

Existem duas formas de fazer o deploy localmente.

### Opção A — Rede simulada temporária (mais rápida)

Ideal para validar rapidamente o script de deploy. O Hardhat sobe uma blockchain em memória, executa o deploy e encerra a rede ao finalizar o comando:

```bash
npm run deploy:ram
```

*(Equivalente a `npx hardhat run scripts/deploy-ram.ts`)*

### Opção B — Nó local persistente (`localhost`)

Ideal quando você quer manter os contratos ativos para interagir com eles depois (por exemplo, a partir de um front-end ou outros scripts).

1. Em um terminal, inicie o nó local do Hardhat (porta padrão `8545`):

   ```bash
   npx hardhat node
   ```

2. Em um **segundo terminal**, execute o deploy apontando para `localhost`:

   ```bash
   npm run deploy:ram:local
   ```

   *(Equivalente a `npx hardhat run scripts/deploy-ram.ts --network localhost`)*

Ao final, o script exibirá os endereços do `RAMToken` e do `RAMExchange`, além das configurações registradas on-chain.

---

## 2. Deploy na Rede Sepolia

Para fazer o deploy na testnet **Sepolia**, você precisa de:

1. Uma **URL RPC da Sepolia** (ex.: Alchemy, Infura ou outro provedor RPC).
2. A **chave privada** de uma carteira de testes com saldo em **Sepolia ETH** suficiente para pagar o gás e a liquidez inicial enviada ao `RAMExchange`.

> **Atenção:** Nunca use a chave privada de uma carteira com fundos reais e nunca faça commit de chaves privadas no Git.

### Passo 1 — Configurar `SEPOLIA_RPC_URL` e `SEPOLIA_PRIVATE_KEY`

O arquivo `hardhat.config.ts` usa `configVariable` para ler essas duas credenciais. Você pode configurá-las de duas maneiras:

#### Forma 1: Hardhat Keystore (recomendado)

Armazena os valores criptografados localmente, sem expor a chave privada no histórico do terminal:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

*(Você pode listar as chaves cadastradas com `npx hardhat keystore list`.)*

#### Forma 2: Variáveis de ambiente na sessão do terminal

```bash
export SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/SUA_API_KEY"
export SEPOLIA_PRIVATE_KEY="0xSUA_CHAVE_PRIVADA"
```

### Passo 2 — Executar o deploy na Sepolia

```bash
npm run deploy:ram:sepolia
```

*(Equivalente a `npx hardhat run scripts/deploy-ram.ts --network sepolia`)*

### Passo 3 (opcional) — Depositar mais liquidez em ETH depois do deploy

Caso queira enviar mais ETH para o `RAMExchange` após o deploy (na Sepolia ou em `localhost`), use o script auxiliar `scripts/deposit-liquidity.ts` com a conta `admin`:

```bash
# Na Sepolia
RAM_EXCHANGE_ADDRESS=0xEnderecoDoRAMExchange \
LIQUIDITY_ETH=0.05 \
npx hardhat run scripts/deposit-liquidity.ts --network sepolia

# No nó local (localhost)
RAM_EXCHANGE_ADDRESS=0xEnderecoDoRAMExchange \
LIQUIDITY_ETH=0.05 \
npx hardhat run scripts/deposit-liquidity.ts --network localhost
```

---

## 3. Deploy usando as variáveis de ambiente não obrigatórias

O script `scripts/deploy-ram.ts` funciona mesmo sem nenhuma variável de ambiente extra, usando valores padrão fixos. Porém, você pode personalizar o deploy definindo qualquer combinação das variáveis opcionais abaixo:

| Variável | O que controla | Valor padrão | Formato / Exemplo |
| --- | --- | --- | --- |
| `RAM_RATE_WEI_PER_TOKEN` | Taxa de conversão em **wei** por **1 RAM inteiro** (`10^18` unidades base), passada ao `constructor` do `RAMExchange`. Deve ser `> 0`. | `1000` | Número inteiro em wei (ex.: `5000` ou `100000000000000`) |
| `RAM_INITIAL_LIQUIDITY_ETH` | Quantidade inicial de **ETH** enviada no `constructor` (`payable`) do `RAMExchange` como liquidez inicial. Pode ser `0`. | `0.001` | Valor decimal em ETH (ex.: `0`, `0.05`, `1`) |
| `RAM_AUTHORIZED_SALAS` | Endereços que serão autorizados logo após o deploy via `RAMToken.setSalasAutorizadas(sala, true)`. | *(nenhum)* | Endereços separados por vírgula (ex.: `0xabc...,0xdef...`) |

### Como passar essas variáveis

Você pode informar apenas as variáveis que quiser alterar (as omitidas continuam usando o valor padrão). O mesmo formato funciona para deploy local, `localhost` e `sepolia`.

#### Exemplo 1 — Definindo direto no comando (inline)

```bash
# Deploy local simulado com taxa, liquidez e salas customizadas
RAM_RATE_WEI_PER_TOKEN=5000 \
RAM_INITIAL_LIQUIDITY_ETH=0.05 \
RAM_AUTHORIZED_SALAS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8,0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
npm run deploy:ram
```

```bash
# Deploy na Sepolia sem enviar liquidez inicial em ETH
RAM_RATE_WEI_PER_TOKEN=10000 \
RAM_INITIAL_LIQUIDITY_ETH=0 \
npm run deploy:ram:sepolia
```

#### Exemplo 2 — Exportando antes de rodar o comando

```bash
export RAM_RATE_WEI_PER_TOKEN=5000
export RAM_INITIAL_LIQUIDITY_ETH=0.02
export RAM_AUTHORIZED_SALAS="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

npm run deploy:ram:local
```

> **Dica:** Se você exportou variáveis na sessão e quiser voltar aos valores padrão depois, basta removê-las com:
> ```bash
> unset RAM_RATE_WEI_PER_TOKEN RAM_INITIAL_LIQUIDITY_ETH RAM_AUTHORIZED_SALAS
> ```
