
const config = {
    initialTokens: '600',
    refreshInterval: 5000,
    contractAddress: '0x8F1e1DC747D66EA0958e271d7EFe1503a77c719E',
    boardSize: 12
};

const HEDERA_TESTNET = {
    chainId: "0x128",
    chainName: "Hedera Testnet",
    nativeCurrency: {
        name: "HBAR",
        symbol: "HBAR",
        decimals: 8
    },
    rpcUrls: ["https://testnet.hashio.io/api"],
    blockExplorerUrls: ["https://hashscan.io/testnet"]
};

let web3, contract, accounts = [], currentPlayerPosition = 0, gameStarted = false, tileData = [], refreshInterval, autoRefreshEnabled = true;

const tilePositions = [];
for (let i = 0; i < config.boardSize; i++) {
    let left, top;
    if (i < 3) {
        left = 85 - (i * 25);
        top = 85;
    } else if (i < 6) {
        left = 10;
        top = 85 - ((i - 3) * 25);
    } else if (i < 9) {
        left = 10 + ((i - 6) * 25);
        top = 10;
    } else {
        left = 85;
        top = 10 + ((i - 9) * 25);
    }
    tilePositions.push({left: `${left}%`, top: `${top}%`});
}

document.addEventListener('DOMContentLoaded', async () => {
    initializeBoard();
    setupEventListeners();
    await tryAutoConnect();
});

async function tryAutoConnect() {
    if (window.ethereum && window.ethereum.selectedAddress) {
        await initializeWeb3();
    } else if (window.ethereum) {
        await initializeWeb3();
    } else {
        addLogEntry("MetaMask not detected. Please install MetaMask.", 'loss');
    }
}

function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(async () => {
        if (accounts.length > 0 && contract) {
            await updateGameState();
            await updateUI();
        }
    }, config.refreshInterval);
}

function stopAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
}

async function initializeWeb3() {
    if (!window.ethereum) {
        alert("Please install MetaMask or another Web3 wallet!");
        addLogEntry("No Web3 wallet detected. Please install MetaMask.", 'loss');
        return;
    }
    try {
        const connectBtn = document.getElementById('connectWallet');
        connectBtn.disabled = true;
        connectBtn.textContent = "Connecting...";
        connectBtn.classList.add('loading');

        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }).catch(err => {
            if (err.code === 4001) {
                throw new Error("User rejected connection request.");
            }
            throw err;
        });

        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== HEDERA_TESTNET.chainId) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: HEDERA_TESTNET.chainId }],
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [HEDERA_TESTNET],
                        });
                    } catch (addError) {
                        addLogEntry(`Failed to add Hedera Testnet: ${addError.message}`, 'loss');
                        resetConnectButton();
                        return;
                    }
                } else {
                    addLogEntry(`Failed to switch to Hedera Testnet: ${switchError.message}`, 'loss');
                    resetConnectButton();
                    return;
                }
            }
        }

        web3 = new Web3(window.ethereum);
        CONTRACT_ABI = [
{
"inputs": [],
"stateMutability": "nonpayable",
"type": "constructor"
},
{
"anonymous": false,
"inputs": [
    {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
    },
    {
        "indexed": true,
        "internalType": "address",
        "name": "spender",
        "type": "address"
    },
    {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
    }
],
"name": "Approval",
"type": "event"
},
{
"inputs": [
    {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
    }
],
"name": "burnTokens",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [],
"name": "claimPoint",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
    {
        "internalType": "address",
        "name": "spender",
        "type": "address"
    },
    {
        "internalType": "uint256",
        "name": "subtractedValue",
        "type": "uint256"
    }
],
"name": "decreaseAllowance",
"outputs": [
    {
        "internalType": "bool",
        "name": "",
        "type": "bool"
    }
],
"stateMutability": "nonpayable",
"type": "function"
},
{
"anonymous": false,
"inputs": [
    {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
    },
    {
        "indexed": false,
        "internalType": "uint256",
        "name": "roll",
        "type": "uint256"
    },
    {
        "indexed": false,
        "internalType": "uint256",
        "name": "newPosition",
        "type": "uint256"
    }
],
"name": "DiceRolled",
"type": "event"
},
{
"inputs": [],
"name": "endGame",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"anonymous": false,
"inputs": [
    {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
    }
],
"name": "GameStarted",
"type": "event"
},
{
"inputs": [
    {
        "internalType": "address",
        "name": "spender",
        "type": "address"
    },
    {
        "internalType": "uint256",
        "name": "addedValue",
        "type": "uint256"
    }
],
"name": "increaseAllowance",
"outputs": [
    {
        "internalType": "bool",
        "name": "",
        "type": "bool"
    }
],
"stateMutability": "nonpayable",
"type": "function"
},
{
"anonymous": false,
"inputs": [
    {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
    },
    {
        "indexed": false,
        "internalType": "uint256",
        "name": "penalty",
        "type": "uint256"
    }
],
"name": "LossLanded",
"type": "event"
},
{
"inputs": [],
"name": "mintTokens",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"anonymous": false,
"inputs": [
    {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
    },
    {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
    }
],
"name": "OwnershipTransferred",
"type": "event"
},
{
"anonymous": false,
"inputs": [],
"name": "PointCapReached",
"type": "event"
},
{
"anonymous": false,
"inputs": [
    {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
    },
    {
        "indexed": false,
        "internalType": "uint256",
        "name": "points",
        "type": "uint256"
    },
    {
        "indexed": false,
        "internalType": "uint256",
        "name": "newThreshold",
        "type": "uint256"
    }
],
"name": "PointEarned",
"type": "event"
},
{
"anonymous": false,
"inputs": [
    {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
    },
    {
        "indexed": false,
        "internalType": "uint256",
        "name": "reward",
        "type": "uint256"
    }
],
"name": "ProfitLanded",
"type": "event"
},
{
"inputs": [],
"name": "renounceOwnership",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [],
"name": "resetWinners",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [],
"name": "rollDice",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
    {
        "internalType": "uint256",
        "name": "_tokenCap",
        "type": "uint256"
    },
    {
        "internalType": "uint256",
        "name": "_maxWinners",
        "type": "uint256"
    }
],
"name": "setTokenCap",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [],
"name": "startGame",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"anonymous": false,
"inputs": [],
"name": "TokenCapReached",
"type": "event"
},
{
"anonymous": false,
"inputs": [
    {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenCap",
        "type": "uint256"
    },
    {
        "indexed": false,
        "internalType": "uint256",
        "name": "maxWinners",
        "type": "uint256"
    }
],
"name": "TokenCapSet",
"type": "event"
},
{
"anonymous": false,
"inputs": [
    {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
    },
    {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
    }
],
"name": "TokensBurned",
"type": "event"
},
{
"anonymous": false,
"inputs": [
    {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
    },
    {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
    }
],
"name": "TokensMinted",
"type": "event"
},
{
"anonymous": false,
"inputs": [
    {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
    },
    {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
    },
    {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
    }
],
"name": "Transfer",
"type": "event"
},
{
"inputs": [
    {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
    }
],
"name": "transferOwnership",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"anonymous": false,
"inputs": [],
"name": "WinnersReset",
"type": "event"
},
{
"inputs": [
    {
        "internalType": "address",
        "name": "owner",
        "type": "address"
    },
    {
        "internalType": "address",
        "name": "spender",
        "type": "address"
    }
],
"name": "allowance",
"outputs": [
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
    {
        "internalType": "address",
        "name": "",
        "type": "address"
    },
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"name": "approve",
"outputs": [
    {
        "internalType": "bool",
        "name": "",
        "type": "bool"
    }
],
"stateMutability": "pure",
"type": "function"
},
{
"inputs": [
    {
        "internalType": "address",
        "name": "account",
        "type": "address"
    }
],
"name": "balanceOf",
"outputs": [
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "BASE_TOKEN_THRESHOLD",
"outputs": [
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "BOARD_SIZE",
"outputs": [
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "decimals",
"outputs": [
    {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
    {
        "internalType": "address",
        "name": "player",
        "type": "address"
    }
],
"name": "getPlayerState",
"outputs": [
    {
        "internalType": "uint256",
        "name": "position",
        "type": "uint256"
    },
    {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
    },
    {
        "internalType": "bool",
        "name": "hasStarted",
        "type": "bool"
    },
    {
        "internalType": "uint256",
        "name": "pointsEarned",
        "type": "uint256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
    {
        "internalType": "uint256",
        "name": "position",
        "type": "uint256"
    }
],
"name": "getTile",
"outputs": [
    {
        "internalType": "string",
        "name": "",
        "type": "string"
    },
    {
        "internalType": "enum HederaPoly.TileType",
        "name": "",
        "type": "uint8"
    },
    {
        "internalType": "int256",
        "name": "",
        "type": "int256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
    {
        "internalType": "address",
        "name": "",
        "type": "address"
    }
],
"name": "hasMinted",
"outputs": [
    {
        "internalType": "bool",
        "name": "",
        "type": "bool"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "INITIAL_TOKENS",
"outputs": [
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "maxWinners",
"outputs": [
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "name",
"outputs": [
    {
        "internalType": "string",
        "name": "",
        "type": "string"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
    {
        "internalType": "address",
        "name": "",
        "type": "address"
    }
],
"name": "nextRequiredHPOLY",
"outputs": [
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "owner",
"outputs": [
    {
        "internalType": "address",
        "name": "",
        "type": "address"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
    {
        "internalType": "address",
        "name": "",
        "type": "address"
    }
],
"name": "players",
"outputs": [
    {
        "internalType": "uint8",
        "name": "position",
        "type": "uint8"
    },
    {
        "internalType": "bool",
        "name": "hasStarted",
        "type": "bool"
    },
    {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
    },
    {
        "internalType": "uint256",
        "name": "pointsEarned",
        "type": "uint256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
    {
        "internalType": "address",
        "name": "",
        "type": "address"
    }
],
"name": "points",
"outputs": [
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "PRNG_ADDRESS",
"outputs": [
    {
        "internalType": "address",
        "name": "",
        "type": "address"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "symbol",
"outputs": [
    {
        "internalType": "string",
        "name": "",
        "type": "string"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "tokenCap",
"outputs": [
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "TOTAL_POINTS_CAP",
"outputs": [
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "TOTAL_SUPPLY_CAP",
"outputs": [
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "totalSupply",
"outputs": [
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
    {
        "internalType": "address",
        "name": "",
        "type": "address"
    },
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"name": "transfer",
"outputs": [
    {
        "internalType": "bool",
        "name": "",
        "type": "bool"
    }
],
"stateMutability": "pure",
"type": "function"
},
{
"inputs": [
    {
        "internalType": "address",
        "name": "",
        "type": "address"
    },
    {
        "internalType": "address",
        "name": "",
        "type": "address"
    },
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"name": "transferFrom",
"outputs": [
    {
        "internalType": "bool",
        "name": "",
        "type": "bool"
    }
],
"stateMutability": "pure",
"type": "function"
},
{
"inputs": [],
"name": "winnerCount",
"outputs": [
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
    {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
    }
],
"name": "winners",
"outputs": [
    {
        "internalType": "address",
        "name": "",
        "type": "address"
    }
],
"stateMutability": "view",
"type": "function"
}
];
        contract = new web3.eth.Contract(CONTRACT_ABI, config.contractAddress);

        try {
            await contract.methods.name().call();
        } catch (error) {
            addLogEntry(`Contract error at ${config.contractAddress}: ${error.message}`, 'loss');
            resetConnectButton();
            return;
        }

        await loadTileData();
        await updateUI();
        await updateGameState();
        startAutoRefresh();

        window.ethereum.on('accountsChanged', (newAccounts) => {
            accounts = newAccounts;
            updateUI();
            updateGameState();
            addLogEntry("Wallet account changed", 'neutral');
        });

        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });

        setupContractEventListeners();

        connectBtn.textContent = "CONNECTED";
        connectBtn.classList.remove('loading');
        connectBtn.style.backgroundColor = "#4CAF50";
        connectBtn.disabled = true;
        addLogEntry("Wallet connected successfully", 'neutral');
    } catch (error) {
        console.error("Web3 Error:", error);
        addLogEntry(`Error connecting wallet: ${error.message}`, 'loss');
        resetConnectButton();
    }
}

async function loadTileData() {
    tileData = [];
    for (let i = 0; i < config.boardSize; i++) {
        try {
            const tile = await contract.methods.getTile(i).call();
            tileData.push({
                name: tile[0],
                type: tile[1],
                value: tile[2]
            });
            updateTileVisual(i, tile[0], tile[1]);
        } catch (error) {
            console.error(`Error loading tile ${i}:`, error);
            addLogEntry(`Error loading tile ${i}: ${error.message}`, 'loss');
        }
    }
}

function updateTileVisual(index, name, type) {
    const tile = document.getElementById(`tile-${index}`);
    if (tile) {
        tile.textContent = name || `Tile ${index}`;
        tile.className = 'tile';
        if (type === '1') {
            tile.classList.add('tile-profit');
            tile.innerHTML += ' 💰';
        } else if (type === '2') {
            tile.classList.add('tile-loss');
            tile.innerHTML += ' ⚠️';
        } else {
            tile.innerHTML += ' 🟦';
        }
    }
}

function setupEventListeners() {
    document.getElementById('connectWallet').addEventListener('click', initializeWeb3);
    document.getElementById('mintTokensBtn').addEventListener('click', mintTokens);
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('rollDiceBtn').addEventListener('click', rollDice);
    document.getElementById('claimPointBtn').addEventListener('click', claimPoint);
    document.getElementById('endGameBtn').addEventListener('click', endGame);
    document.getElementById('autoRefreshToggle').addEventListener('change', (e) => {
        autoRefreshEnabled = e.target.checked;
        if (autoRefreshEnabled) startAutoRefresh();
        else stopAutoRefresh();
    });
    document.getElementById('helpBtn').addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'block';
    });
    document.getElementsByClassName('close')[0].addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'none';
    });
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('helpModal')) {
            document.getElementById('helpModal').style.display = 'none';
        }
    });
}

function setupContractEventListeners() {
    contract.events.GameStarted({}).on('data', event => {
        if (event.returnValues.player.toLowerCase() === accounts[0].toLowerCase()) {
            addLogEntry("Game started!", 'neutral');
            gameStarted = true;
            updateGameState();
            loadTileData();
        }
    }).on('error', error => addLogEntry("Error listening to game events", 'loss'));
    contract.events.DiceRolled({}).on('data', event => {
        if (event.returnValues.player.toLowerCase() === accounts[0].toLowerCase()) {
            addLogEntry(`Rolled ${event.returnValues.roll}, moved to position ${event.returnValues.newPosition}`, 'neutral');
            updateGameState();
        }
    });
    contract.events.ProfitLanded({}).on('data', event => {
        if (event.returnValues.player.toLowerCase() === accounts[0].toLowerCase()) {
            addLogEntry(`+${event.returnValues.reward} HPOLY from landing!`, 'profit');
            updateGameState();
        }
    });
    contract.events.LossLanded({}).on('data', event => {
        if (event.returnValues.player.toLowerCase() === accounts[0].toLowerCase()) {
            addLogEntry(`-${event.returnValues.penalty} HPOLY from landing!`, 'loss');
            updateGameState();
        }
    });
    contract.events.TokensMinted({}).on('data', event => {
        if (event.returnValues.to.toLowerCase() === accounts[0].toLowerCase()) {
            addLogEntry(`Minted ${event.returnValues.amount} HPOLY`, 'profit');
            updateGameState();
        }
    });
    contract.events.TokensBurned({}).on('data', event => {
        if (event.returnValues.from.toLowerCase() === accounts[0].toLowerCase()) {
            addLogEntry(`Burned ${event.returnValues.amount} HPOLY`, 'loss');
            updateGameState();
        }
    });
    contract.events.PointEarned({}).on('data', event => {
        if (event.returnValues.player.toLowerCase() === accounts[0].toLowerCase()) {
            addLogEntry(`Earned point! Total: ${event.returnValues.points}`, 'profit');
            updateUI();
        }
    });
}

function resetConnectButton() {
    const connectBtn = document.getElementById('connectWallet');
    connectBtn.disabled = false;
    connectBtn.textContent = "CONNECT WALLET";
    connectBtn.classList.remove('loading');
    connectBtn.style.backgroundColor = "";
}

function initializeBoard() {
    const board = document.getElementById('board');
    for (let i = 0; i < config.boardSize; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.id = `tile-${i}`;
        tile.style.left = tilePositions[i].left;
        tile.style.top = tilePositions[i].top;
        tile.textContent = `Loading...`;
        tile.addEventListener('click', () => showTileDetails(i));
        board.appendChild(tile);
    }
    const token = document.createElement('div');
    token.className = 'player-token';
    token.id = 'player-token';
    token.style.display = 'none';
    board.appendChild(token);
}

async function mintTokens() {
    try {
        document.getElementById('mintTokensBtn').disabled = true;
        document.getElementById('mintTokensBtn').textContent = "Minting...";
        document.getElementById('mintTokensBtn').classList.add('loading');
        await contract.methods.mintTokens().send({ from: accounts[0], gas: 500000 });
        document.getElementById('mintTokensBtn').textContent = "💰 MINT HPOLY";
        document.getElementById('mintTokensBtn').classList.remove('loading');
    } catch (error) {
        console.error("Mint Tokens Error:", error);
        addLogEntry(`Error minting tokens: ${error.message}`, 'loss');
        document.getElementById('mintTokensBtn').disabled = false;
        document.getElementById('mintTokensBtn').textContent = "💰 MINT HPOLY";
        document.getElementById('mintTokensBtn').classList.remove('loading');
    }
}

async function startGame() {
    try {
        document.getElementById('startGameBtn').disabled = true;
        document.getElementById('startGameBtn').textContent = "Starting...";
        document.getElementById('startGameBtn').classList.add('loading');
        await contract.methods.startGame().send({ from: accounts[0], gas: 500000 });
        document.getElementById('startGameBtn').textContent = "Game Started";
        document.getElementById('startGameBtn').style.backgroundColor = "#4CAF50";
        document.getElementById('startGameBtn').classList.remove('loading');
        document.getElementById('player-token').style.display = 'block';
    } catch (error) {
        console.error("Start Game Error:", error);
        addLogEntry(`Error starting game: ${error.message}`, 'loss');
        document.getElementById('startGameBtn').disabled = false;
        document.getElementById('startGameBtn').textContent = "🚀 START GAME";
        document.getElementById('startGameBtn').classList.remove('loading');
    }
}

async function rollDice() {
    try {
        document.getElementById('rollDiceBtn').disabled = true;
        document.getElementById('rollDiceBtn').classList.add('dice-animation');
        const diceResult = document.getElementById('diceResult');
        diceResult.style.display = 'block';
        diceResult.textContent = '🎲 Rolling...';
        for (let i = 0; i < 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 300));
            diceResult.textContent = `🎲 Rolling... ${i+1}`;
        }
        await contract.methods.rollDice().send({ from: accounts[0], gas: 500000 });
        setTimeout(() => {
            diceResult.style.display = 'none';
            document.getElementById('rollDiceBtn').classList.remove('dice-animation');
        }, 2000);
    } catch (error) {
        console.error("Roll Dice Error:", error);
        addLogEntry(`Error rolling dice: ${error.message}`, 'loss');
        document.getElementById('rollDiceBtn').disabled = false;
        document.getElementById('rollDiceBtn').classList.remove('dice-animation');
        document.getElementById('diceResult').style.display = 'none';
    }
}

async function claimPoint() {
    try {
        document.getElementById('claimPointBtn').disabled = true;
        document.getElementById('claimPointBtn').textContent = "Claiming...";
        document.getElementById('claimPointBtn').classList.add('loading');
        await contract.methods.claimPoint().send({ from: accounts[0], gas: 500000 });
        document.getElementById('claimPointBtn').textContent = "🔥 CLAIM POINT";
        document.getElementById('claimPointBtn').classList.remove('loading');
    } catch (error) {
        console.error("Claim Point Error:", error);
        addLogEntry(`Error claiming point: ${error.message}`, 'loss');
        document.getElementById('claimPointBtn').disabled = false;
        document.getElementById('claimPointBtn').textContent = "🔥 CLAIM POINT";
        document.getElementById('claimPointBtn').classList.remove('loading');
    }
}

async function endGame() {
    try {
        document.getElementById('endGameBtn').disabled = true;
        document.getElementById('endGameBtn').textContent = "Ending...";
        document.getElementById('endGameBtn').classList.add('loading');
        await contract.methods.endGame().send({ from: accounts[0], gas: 500000 });
        document.getElementById('endGameBtn').textContent = "🏁 END GAME";
        document.getElementById('endGameBtn').classList.remove('loading');
        document.getElementById('player-token').style.display = 'none';
    } catch (error) {
        console.error("End Game Error:", error);
        addLogEntry(`Error ending game: ${error.message}`, 'loss');
        document.getElementById('endGameBtn').disabled = false;
        document.getElementById('endGameBtn').textContent = "🏁 END GAME";
        document.getElementById('endGameBtn').classList.remove('loading');
    }
}

async function updateUI() {
    if (accounts.length > 0) {
        document.getElementById('connectWallet').style.display = 'none';
        document.getElementById('walletInfo').style.display = 'block';
        const shortAddress = `${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`;
        document.getElementById('walletAddress').textContent = shortAddress;
        try {
            const balance = await web3.eth.getBalance(accounts[0]);
            document.getElementById('hbarBalance').textContent = parseFloat(web3.utils.fromWei(balance, 'ether')).toFixed(4);
            const tokenBalance = await contract.methods.balanceOf(accounts[0]).call();
            document.getElementById('tokenBalance').textContent = parseFloat(tokenBalance).toFixed(2);
            const points = await contract.methods.points(accounts[0]).call();
            document.getElementById('points').textContent = points;
            const nextReq = await contract.methods.nextRequiredHPOLY(accounts[0]).call();
            document.getElementById('nextRequiredHPOLY').textContent = nextReq;
            const totalSupply = await contract.methods.totalSupply().call();
            document.getElementById('totalSupply').textContent = totalSupply;
            const winnerCount = await contract.methods.winnerCount().call();
            document.getElementById('winnerCount').textContent = winnerCount;
            const claimPointBtn = document.getElementById('claimPointBtn');
            if (Number(tokenBalance) >= Number(nextReq)) {
                claimPointBtn.disabled = false;
                claimPointBtn.classList.remove('disabled');
                claimPointBtn.classList.add('enabled');
            } else {
                claimPointBtn.disabled = true;
                claimPointBtn.classList.remove('enabled');
                claimPointBtn.classList.add('disabled');
            }
            const hasMinted = await contract.methods.hasMinted(accounts[0]).call();
            document.getElementById('mintTokensBtn').disabled = hasMinted;
            if (hasMinted) {
                document.getElementById('mintTokensBtn').textContent = "HPOLY Minted";
                document.getElementById('mintTokensBtn').style.backgroundColor = "#4CAF50";
            }
        } catch (error) {
            console.error("Update UI Error:", error);
            addLogEntry(`Error updating balances: ${error.message}`, 'loss');
        }
    }
}

async function updateGameState() {
    if (!contract || !accounts[0]) return;
    try {
        const player = await contract.methods.getPlayerState(accounts[0]).call();
        gameStarted = player.hasStarted;
        if (gameStarted) {
            currentPlayerPosition = player.position;
            document.getElementById('playerPosition').textContent = currentPlayerPosition;
            document.getElementById('playerBalance').textContent = player.balance;
            const token = document.getElementById('player-token');
            token.style.left = tilePositions[currentPlayerPosition].left;
            token.style.top = tilePositions[currentPlayerPosition].top;
            document.getElementById('rollDiceBtn').disabled = false;
            document.getElementById('endGameBtn').disabled = false;
            highlightCurrentPosition(currentPlayerPosition);
        } else {
            document.getElementById('rollDiceBtn').disabled = true;
            document.getElementById('endGameBtn').disabled = true;
        }
        document.getElementById('playerStatus').textContent = gameStarted ? "Active" : "Not Started";
        document.getElementById('playerStatus').style.color = gameStarted ? "#4CAF50" : "#F44336";
    } catch (error) {
        console.error("Update Game State Error:", error);
        addLogEntry(`Error updating game state: ${error.message}`, 'loss');
    }
}

function highlightCurrentPosition(position) {
    for (let i = 0; i < config.boardSize; i++) {
        const tile = document.getElementById(`tile-${i}`);
        tile.style.boxShadow = 'none';
        tile.style.zIndex = '1';
    }
    const currentTile = document.getElementById(`tile-${position}`);
    if (currentTile) {
        currentTile.style.boxShadow = '0 0 15px var(--hedera-pink)';
        currentTile.style.zIndex = '10';
    }
}

async function showTileDetails(tileId) {
    try {
        const tileDetails = await contract.methods.getTile(tileId).call();
        const panel = document.getElementById('tileDetails');
        panel.style.display = 'block';
        document.getElementById('tileName').textContent = tileDetails[0];
        let tileType;
        switch(tileDetails[1]) {
            case '0': tileType = "NEUTRAL"; break;
            case '1': tileType = "PROFIT"; break;
            case '2': tileType = "LOSS"; break;
            default: tileType = "UNKNOWN";
        }
        document.getElementById('tileType').textContent = tileType;
        document.getElementById('tileValue').textContent = tileDetails[2];
    } catch (error) {
        console.error("Tile Details Error:", error);
        addLogEntry(`Error getting tile details: ${error.message}`, 'loss');
    }
}

function addLogEntry(message, type = 'neutral') {
    const log = document.getElementById('logEntries');
    const entry = document.createElement('div');
    entry.className = `log-entry log-entry-${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}