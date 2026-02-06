// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ITSRegistry
 * @dev Smart contract for managing V2X communication, vehicle registration, and security alerts in ITS network
 */
contract ITSRegistry {

    struct Vehicle {
        address vehicleAddress;
        string vehicleId;
        string publicKey;
        bool isRegistered;
        uint256 registrationTime;
    }

    struct V2XMessage {
        string messageId;
        string messageHash;
        string messageType;
        string senderId;
        uint256 timestamp;
        uint8 priority; // 0=critical, 1=high, 2=normal
        int256 latitude;
        int256 longitude;
        string signature;
        string status; // "submitted", "validated", "rejected"
        uint256 blockNumber;
    }

    struct SecurityAlert {
        string alertId;
        string vehicleId;
        string alertType;
        string severity;
        string description;
        uint256 timestamp;
        address submitter;
    }

    mapping(string => Vehicle) public vehicles;
    mapping(string => V2XMessage) public v2xMessages;
    mapping(string => SecurityAlert) public securityAlerts;
    mapping(address => string) public addressToVehicleId;

    string[] public vehicleIds;
    string[] public messageIds;
    string[] public alertIds;

    address public owner;

    event VehicleRegistered(string vehicleId, address vehicleAddress, uint256 timestamp);
    event V2XMessageSubmitted(string messageId, string messageType, string senderId, uint8 priority, uint256 timestamp);
    event SecurityAlertSubmitted(string alertId, string vehicleId, string alertType, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyRegisteredVehicle() {
        require(bytes(addressToVehicleId[msg.sender]).length > 0, "Vehicle not registered");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Register a new vehicle in the network
     * @param _vehicleId Unique vehicle identifier
     * @param _publicKey Vehicle's public key
     */
    function registerVehicle(string memory _vehicleId, string memory _publicKey) public {
        require(!vehicles[_vehicleId].isRegistered, "Vehicle already registered");
        require(bytes(addressToVehicleId[msg.sender]).length == 0, "Address already registered to another vehicle");

        vehicles[_vehicleId] = Vehicle({
            vehicleAddress: msg.sender,
            vehicleId: _vehicleId,
            publicKey: _publicKey,
            isRegistered: true,
            registrationTime: block.timestamp
        });

        addressToVehicleId[msg.sender] = _vehicleId;
        vehicleIds.push(_vehicleId);

        emit VehicleRegistered(_vehicleId, msg.sender, block.timestamp);
    }

    /**
     * @dev Submit a V2X message to the blockchain
     * @param _messageId Unique message identifier
     * @param _messageHash Hash of the message content
     * @param _messageType Type of message (EMERGENCY_BRAKE, TRAFFIC_LIGHT, etc.)
     * @param _priority Priority level (0=critical, 1=high, 2=normal)
     * @param _latitude Latitude coordinate (scaled by 1e6)
     * @param _longitude Longitude coordinate (scaled by 1e6)
     * @param _signature Digital signature
     */
    function submitV2XMessage(
        string memory _messageId,
        string memory _messageHash,
        string memory _messageType,
        uint8 _priority,
        int256 _latitude,
        int256 _longitude,
        string memory _signature
    ) public onlyRegisteredVehicle {
        require(bytes(v2xMessages[_messageId].messageId).length == 0, "Message ID already exists (replay attack detected)");
        require(_priority <= 2, "Invalid priority level");

        string memory senderId = addressToVehicleId[msg.sender];

        v2xMessages[_messageId] = V2XMessage({
            messageId: _messageId,
            messageHash: _messageHash,
            messageType: _messageType,
            senderId: senderId,
            timestamp: block.timestamp,
            priority: _priority,
            latitude: _latitude,
            longitude: _longitude,
            signature: _signature,
            status: "validated",
            blockNumber: block.number
        });

        messageIds.push(_messageId);

        emit V2XMessageSubmitted(_messageId, _messageType, senderId, _priority, block.timestamp);
    }

    /**
     * @dev Submit a security alert to the network
     * @param _alertId Unique alert identifier
     * @param _alertType Type of security alert
     * @param _severity Severity level
     * @param _description Alert description
     */
    function submitSecurityAlert(
        string memory _alertId,
        string memory _alertType,
        string memory _severity,
        string memory _description
    ) public onlyRegisteredVehicle {
        require(bytes(securityAlerts[_alertId].alertId).length == 0, "Alert ID already exists");

        string memory vehicleId = addressToVehicleId[msg.sender];

        securityAlerts[_alertId] = SecurityAlert({
            alertId: _alertId,
            vehicleId: vehicleId,
            alertType: _alertType,
            severity: _severity,
            description: _description,
            timestamp: block.timestamp,
            submitter: msg.sender
        });

        alertIds.push(_alertId);

        emit SecurityAlertSubmitted(_alertId, vehicleId, _alertType, block.timestamp);
    }

    /**
     * @dev Get V2X message by ID
     * @param _messageId Message identifier
     * @return V2XMessage struct
     */
    function getV2XMessage(string memory _messageId) public view returns (V2XMessage memory) {
        require(bytes(v2xMessages[_messageId].messageId).length > 0, "Message not found");
        return v2xMessages[_messageId];
    }

    /**
     * @dev Get vehicle information by ID
     * @param _vehicleId Vehicle identifier
     * @return Vehicle struct
     */
    function getVehicle(string memory _vehicleId) public view returns (Vehicle memory) {
        require(vehicles[_vehicleId].isRegistered, "Vehicle not found");
        return vehicles[_vehicleId];
    }

    /**
     * @dev Get security alert by ID
     * @param _alertId Alert identifier
     * @return SecurityAlert struct
     */
    function getSecurityAlert(string memory _alertId) public view returns (SecurityAlert memory) {
        require(bytes(securityAlerts[_alertId].alertId).length > 0, "Alert not found");
        return securityAlerts[_alertId];
    }

    /**
     * @dev Get total number of V2X messages
     * @return Number of messages
     */
    function getMessageCount() public view returns (uint256) {
        return messageIds.length;
    }

    /**
     * @dev Get total number of registered vehicles
     * @return Number of vehicles
     */
    function getVehicleCount() public view returns (uint256) {
        return vehicleIds.length;
    }

    /**
     * @dev Get total number of security alerts
     * @return Number of alerts
     */
    function getAlertCount() public view returns (uint256) {
        return alertIds.length;
    }

    /**
     * @dev Get all V2X message IDs
     * @return Array of message IDs
     */
    function getAllMessageIds() public view returns (string[] memory) {
        return messageIds;
    }

    /**
     * @dev Get all vehicle IDs
     * @return Array of vehicle IDs
     */
    function getAllVehicleIds() public view returns (string[] memory) {
        return vehicleIds;
    }

    /**
     * @dev Get all alert IDs
     * @return Array of alert IDs
     */
    function getAllAlertIds() public view returns (string[] memory) {
        return alertIds;
    }

    /**
     * @dev Check if vehicle is registered
     * @param _vehicleId Vehicle identifier
     * @return Boolean indicating registration status
     */
    function isVehicleRegistered(string memory _vehicleId) public view returns (bool) {
        return vehicles[_vehicleId].isRegistered;
    }

    /**
     * @dev Check if message exists (replay attack prevention)
     * @param _messageId Message identifier
     * @return Boolean indicating if message exists
     */
    function messageExists(string memory _messageId) public view returns (bool) {
        return bytes(v2xMessages[_messageId].messageId).length > 0;
    }
}
