// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CampaignRegistry
 * @notice Creator-launched scratch card campaigns. Stores configuration and play counts.
 */
contract CampaignRegistry is Ownable {
    enum CardTier { Bronze, Silver, Gold, Platinum, Diamond }

    struct CampaignConfig {
        address creator;
        uint16 creatorShareBps;
        CardTier tier;
        string brandingURI;
        uint32 maxPlays;
        uint64 expiry;
    }

    mapping(bytes32 => CampaignConfig) public campaigns;
    mapping(bytes32 => uint32) public playCount;

    address public gameManager;

    event CampaignCreated(bytes32 indexed campaignId, CampaignConfig config);
    event GameManagerSet(address indexed gameManager);

    modifier onlyGameManager() {
        require(msg.sender == gameManager, "CampaignRegistry: only game manager");
        _;
    }

    constructor(address owner_) Ownable(owner_) {}

    function setGameManager(address gameManager_) external onlyOwner {
        require(gameManager_ != address(0), "CampaignRegistry: invalid address");
        gameManager = gameManager_;
        emit GameManagerSet(gameManager_);
    }

    /**
     * @notice Create a new campaign. campaignId must be unique.
     */
    function createCampaign(bytes32 campaignId, CampaignConfig calldata config) external {
        require(config.creator != address(0), "CampaignRegistry: invalid creator");
        require(config.creatorShareBps <= 5000, "CampaignRegistry: share too high");
        require(config.maxPlays > 0, "CampaignRegistry: invalid max plays");
        require(config.expiry > block.timestamp, "CampaignRegistry: invalid expiry");
        require(campaigns[campaignId].creator == address(0), "CampaignRegistry: exists");

        campaigns[campaignId] = config;
        emit CampaignCreated(campaignId, config);
    }

    /**
     * @notice Full campaign view for the frontend.
     */
    function getCampaign(bytes32 campaignId) external view returns (
        CampaignConfig memory config,
        uint32 plays,
        bool active
    ) {
        config = campaigns[campaignId];
        plays = playCount[campaignId];
        active = _isCampaignActive(campaignId, config);
    }

    /**
     * @notice Convenience check for active status.
     */
    function isCampaignActive(bytes32 campaignId) external view returns (bool) {
        CampaignConfig memory config = campaigns[campaignId];
        return _isCampaignActive(campaignId, config);
    }

    function _isCampaignActive(bytes32 campaignId, CampaignConfig memory config) internal view returns (bool) {
        return config.creator != address(0)
            && block.timestamp < config.expiry
            && playCount[campaignId] < config.maxPlays;
    }

    /**
     * @notice Called by GameManager after a game is settled.
     */
    function incrementPlayCount(bytes32 campaignId) external onlyGameManager {
        playCount[campaignId]++;
    }
}
