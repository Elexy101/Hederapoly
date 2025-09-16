// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

interface IPrng {
    function getPseudorandomSeed() external returns (bytes32);
}

contract HederaPoly is Ownable, ERC1155 {
    address public immutable PRNG_ADDRESS = 0x0000000000000000000000000000000000000169;
    uint256 public constant INITIAL_TOKENS = 100;
    uint256 public constant TOTAL_SUPPLY_CAP = 12_000_000;
    uint256 public constant TOTAL_NFT_CAP = 6_000;
    uint256 public constant BOARD_SIZE = 12;
    uint256 public constant HPOLY_TOKEN_ID = 0;

    enum TileType { NEUTRAL, PROFIT, LOSS }

    struct Tile {
        TileType tileType;
        int32 value;
        bytes12 name;
    }

    struct Player {
        uint8 position;
        bool hasStarted;
        uint256 balance;
    }

    uint256 public tokenCap;
    uint256 public nftCount;
    uint256 public totalHPOLYSupply;
    mapping(address => Player) public players;
    mapping(address => bool) public hasMintedInitial;
    mapping(address => uint256) public nextRequiredHPOLY;
    Tile[BOARD_SIZE] private board;
    bool private boardInitialized;

    event GameStarted(address indexed player);
    event DiceRolled(address indexed player, uint256 roll, uint256 newPosition);
    event ProfitLanded(address indexed player, uint256 reward);
    event LossLanded(address indexed player, uint256 penalty);
    event NFTMinted(address indexed player, uint256 tokenId);
    event TokenCapSet(uint256 tokenCap);
    event TokenCapReached();
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    constructor() ERC1155("https://example.com/api/token/{id}.json") Ownable() {
        _initializeBoard();
        boardInitialized = true;
        tokenCap = 1000;
    }

    function mintTokens() external {
        require(!hasMintedInitial[msg.sender], "Already minted initial tokens");
        require(totalHPOLYSupply + INITIAL_TOKENS <= TOTAL_SUPPLY_CAP, "Exceeds HPOLY supply cap");
        hasMintedInitial[msg.sender] = true;
        totalHPOLYSupply += INITIAL_TOKENS;
        _mint(msg.sender, HPOLY_TOKEN_ID, INITIAL_TOKENS, "");
        emit TokensMinted(msg.sender, INITIAL_TOKENS);
    }

    function burnTokens(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        totalHPOLYSupply -= amount;
        _burn(msg.sender, HPOLY_TOKEN_ID, amount);
        emit TokensBurned(msg.sender, amount);
    }

    function setApprovalForAll(address operator, bool approved) public view override {
        revert("Approvals are disabled");
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) public pure override {
        revert("HPOLY transfers are disabled");
    }

    function safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public pure override {
        revert("HPOLY transfers are disabled");
    }

    function startGame() external {
        require(!players[msg.sender].hasStarted, "Already playing");
        require(balanceOf(msg.sender, HPOLY_TOKEN_ID) >= INITIAL_TOKENS, "Insufficient HPOLY tokens");

        players[msg.sender] = Player({
            position: 0,
            hasStarted: true,
            balance: INITIAL_TOKENS
        });
        nextRequiredHPOLY[msg.sender] = tokenCap;

        emit GameStarted(msg.sender);
    }

    function endGame() external {
        require(players[msg.sender].hasStarted, "Not playing");
        players[msg.sender].hasStarted = false;
    }

    function rollDice() external {
        Player storage player = players[msg.sender];
        require(player.hasStarted, "Start game first");

        uint256 roll = _random() % 6 + 1;
        player.position = uint8((player.position + roll) % BOARD_SIZE);

        emit DiceRolled(msg.sender, roll, player.position);
        _handleLanding(msg.sender, player.position);
    }

    function mintNFT() external {
        Player storage player = players[msg.sender];
        require(player.hasStarted, "Start game first");
        require(balanceOf(msg.sender, HPOLY_TOKEN_ID) >= nextRequiredHPOLY[msg.sender], "Insufficient HPOLY");
        require(nftCount < TOTAL_NFT_CAP, "NFT cap reached");

        uint256 required = nextRequiredHPOLY[msg.sender];
        totalHPOLYSupply -= required;
        _burn(msg.sender, HPOLY_TOKEN_ID, required);
        emit TokensBurned(msg.sender, required);

        uint256 tokenId = nftCount + 1;
        _mint(msg.sender, tokenId, 1, "");
        nftCount++;
        emit NFTMinted(msg.sender, tokenId);

        nextRequiredHPOLY[msg.sender] = tokenCap;

        if (nftCount >= TOTAL_NFT_CAP) {
            emit TokenCapReached();
        }
    }

    function setTokenCap(uint256 _tokenCap) external onlyOwner {
        require(_tokenCap > INITIAL_TOKENS, "Token cap must be greater than initial tokens");
        require(totalHPOLYSupply + (_tokenCap * TOTAL_NFT_CAP) <= TOTAL_SUPPLY_CAP, "Token cap exceeds HPOLY supply");
        tokenCap = _tokenCap;
        emit TokenCapSet(_tokenCap);
    }

    function _initializeBoard() private {
        board[0] = Tile(TileType.NEUTRAL, 0, bytes12("GO"));
        board[1] = Tile(TileType.PROFIT, 100, bytes12("Addis Ababa"));
        board[2] = Tile(TileType.LOSS, -50, bytes12("Community C"));
        board[3] = Tile(TileType.PROFIT, 80, bytes12("Freelance"));
        board[4] = Tile(TileType.LOSS, -100, bytes12("Car Repair"));
        board[5] = Tile(TileType.PROFIT, 120, bytes12("Lagos"));
        board[6] = Tile(TileType.NEUTRAL, 0, bytes12("Jail"));
        board[7] = Tile(TileType.PROFIT, 140, bytes12("Nairobi"));
        board[8] = Tile(TileType.LOSS, -80, bytes12("Chance"));
        board[9] = Tile(TileType.PROFIT, 160, bytes12("Cairo"));
        board[10] = Tile(TileType.NEUTRAL, 0, bytes12("Free Park"));
        board[11] = Tile(TileType.LOSS, -120, bytes12("Go To Jail"));
    }

    function _handleLanding(address playerAddr, uint8 position) internal {
        Player storage player = players[playerAddr];
        Tile memory tile = board[position];

        if (tile.tileType == TileType.PROFIT) {
            uint256 reward = uint256(uint32(uint256(int256(tile.value))));
            if (totalHPOLYSupply + reward <= TOTAL_SUPPLY_CAP) {
                totalHPOLYSupply += reward;
                _mint(playerAddr, HPOLY_TOKEN_ID, reward, "");
                player.balance += reward;
                emit ProfitLanded(playerAddr, reward);
            } else {
                emit TokenCapReached();
            }
        } else if (tile.tileType == TileType.LOSS) {
            uint256 penalty = uint256(uint32(uint256(int256(-tile.value))));
            if (balanceOf(playerAddr, HPOLY_TOKEN_ID) >= penalty) {
                totalHPOLYSupply -= penalty;
                _burn(playerAddr, HPOLY_TOKEN_ID, penalty);
                player.balance -= penalty;
                emit LossLanded(playerAddr, penalty);
            } else {
                uint256 remainingBalance = balanceOf(playerAddr, HPOLY_TOKEN_ID);
                totalHPOLYSupply -= remainingBalance;
                _burn(playerAddr, HPOLY_TOKEN_ID, remainingBalance);
                player.balance = 0;
                player.hasStarted = false;
                emit LossLanded(playerAddr, remainingBalance);
            }
        }
    }

    function _random() internal returns (uint256) {
        bytes32 seed;
        try IPrng(PRNG_ADDRESS).getPseudorandomSeed() returns (bytes32 _seed) {
            seed = _seed;
        } catch {
            seed = bytes32(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.number)));
        }
        return uint256(keccak256(abi.encodePacked(seed, block.timestamp, msg.sender)));
    }

    function getTile(uint256 position) external view returns (string memory, TileType, int256) {
        require(position < BOARD_SIZE, "Invalid tile");
        Tile memory t = board[position];
        return (string(abi.encodePacked(t.name)), t.tileType, int256(t.value));
    }

    function getPlayerState(address player) external view returns (uint256 position, uint256 balance, bool hasStarted) {
        Player memory p = players[player];
        return (p.position, p.balance, p.hasStarted);
    }
}