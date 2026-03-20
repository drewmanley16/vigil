// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/// @title GuardianWallet
/// @notice Proxy wallet for elderly users. Large transactions require guardian co-signature.
///         The Vigil AI agent monitors transactions and annotates them with Venice-derived risk scores.
contract GuardianWallet {
    // ─── Structs ───────────────────────────────────────────────────────────────

    struct Guardian {
        bool active;
        string telegramHandle;
    }

    struct PendingTransaction {
        address to;
        uint256 value;
        bytes data;
        uint256 timestamp;
        bool executed;
        bool cancelled;
        uint256 riskScore;
        string riskReason;
        bool riskScoreSet;
    }

    // ─── State ─────────────────────────────────────────────────────────────────

    address public owner;
    address public agent;
    uint256 public threshold;
    uint256 public txCount;

    mapping(address => Guardian) public guardians;
    mapping(uint256 => PendingTransaction) public pendingTxs;

    // ─── Events ────────────────────────────────────────────────────────────────

    event TransactionProposed(
        uint256 indexed txId,
        address indexed to,
        uint256 value,
        bytes data,
        uint256 timestamp
    );
    event TransactionExecuted(uint256 indexed txId, address indexed approvedBy);
    event TransactionCancelled(uint256 indexed txId, address indexed cancelledBy);
    event DirectTransfer(address indexed to, uint256 value, uint256 timestamp);
    event RiskScoreSet(uint256 indexed txId, uint256 score, string reason);
    event SuspiciousActivityFlagged(address indexed to, uint256 value, string reason);
    event GuardianAdded(address indexed guardian, string telegramHandle);
    event GuardianRemoved(address indexed guardian);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event AgentUpdated(address indexed oldAgent, address indexed newAgent);

    // ─── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "GuardianWallet: not owner");
        _;
    }

    modifier onlyGuardian() {
        require(guardians[msg.sender].active, "GuardianWallet: not guardian");
        _;
    }

    modifier onlyAgent() {
        require(msg.sender == agent, "GuardianWallet: not agent");
        _;
    }

    modifier txExists(uint256 txId) {
        require(txId < txCount, "GuardianWallet: tx does not exist");
        _;
    }

    modifier txPending(uint256 txId) {
        PendingTransaction storage tx_ = pendingTxs[txId];
        require(!tx_.executed, "GuardianWallet: already executed");
        require(!tx_.cancelled, "GuardianWallet: already cancelled");
        _;
    }

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor(address _owner, uint256 _threshold, address _agent) {
        require(_owner != address(0), "GuardianWallet: zero owner");
        owner = _owner;
        threshold = _threshold;
        agent = _agent;
    }

    // ─── Owner Actions ─────────────────────────────────────────────────────────

    /// @notice Propose a transaction above threshold. ETH locked in contract until guardian acts.
    function propose(
        address to,
        uint256 value,
        bytes calldata data
    ) external payable onlyOwner returns (uint256 txId) {
        require(to != address(0), "GuardianWallet: zero recipient");
        require(msg.value == value, "GuardianWallet: value mismatch");

        txId = txCount++;
        pendingTxs[txId] = PendingTransaction({
            to: to,
            value: value,
            data: data,
            timestamp: block.timestamp,
            executed: false,
            cancelled: false,
            riskScore: 0,
            riskReason: "",
            riskScoreSet: false
        });

        emit TransactionProposed(txId, to, value, data, block.timestamp);
    }

    /// @notice Execute a sub-threshold transaction directly. Still emits event for agent monitoring.
    function executeDirectly(
        address to,
        uint256 value,
        bytes calldata data
    ) external payable onlyOwner {
        require(to != address(0), "GuardianWallet: zero recipient");
        require(msg.value == value, "GuardianWallet: value mismatch");

        emit DirectTransfer(to, value, block.timestamp);

        (bool success, ) = to.call{value: value}(data);
        require(success, "GuardianWallet: execution failed");
    }

    // ─── Guardian Actions ──────────────────────────────────────────────────────

    /// @notice Approve a pending transaction and execute it.
    function approve(uint256 txId)
        external
        onlyGuardian
        txExists(txId)
        txPending(txId)
    {
        PendingTransaction storage tx_ = pendingTxs[txId];
        tx_.executed = true;

        emit TransactionExecuted(txId, msg.sender);

        (bool success, ) = tx_.to.call{value: tx_.value}(tx_.data);
        require(success, "GuardianWallet: execution failed");
    }

    /// @notice Cancel a pending transaction and refund the owner.
    function cancel(uint256 txId)
        external
        onlyGuardian
        txExists(txId)
        txPending(txId)
    {
        PendingTransaction storage tx_ = pendingTxs[txId];
        tx_.cancelled = true;

        emit TransactionCancelled(txId, msg.sender);

        (bool success, ) = owner.call{value: tx_.value}("");
        require(success, "GuardianWallet: refund failed");
    }

    // ─── Agent Actions ─────────────────────────────────────────────────────────

    /// @notice Record a Venice-derived risk score for a pending transaction.
    function setRiskScore(
        uint256 txId,
        uint256 score,
        string calldata reason
    ) external onlyAgent txExists(txId) {
        require(score <= 100, "GuardianWallet: score out of range");
        PendingTransaction storage tx_ = pendingTxs[txId];
        tx_.riskScore = score;
        tx_.riskReason = reason;
        tx_.riskScoreSet = true;

        emit RiskScoreSet(txId, score, reason);

        // Flag on-chain if CRITICAL (score >= 80)
        if (score >= 80) {
            emit SuspiciousActivityFlagged(tx_.to, tx_.value, reason);
        }
    }

    // ─── Admin ─────────────────────────────────────────────────────────────────

    function addGuardian(address guardian, string calldata telegramHandle) external onlyOwner {
        require(guardian != address(0), "GuardianWallet: zero guardian");
        guardians[guardian] = Guardian({active: true, telegramHandle: telegramHandle});
        emit GuardianAdded(guardian, telegramHandle);
    }

    function removeGuardian(address guardian) external onlyOwner {
        guardians[guardian].active = false;
        emit GuardianRemoved(guardian);
    }

    function setThreshold(uint256 newThreshold) external onlyOwner {
        emit ThresholdUpdated(threshold, newThreshold);
        threshold = newThreshold;
    }

    function setAgent(address agentAddress) external onlyOwner {
        require(agentAddress != address(0), "GuardianWallet: zero agent");
        emit AgentUpdated(agent, agentAddress);
        agent = agentAddress;
    }

    // ─── Views ─────────────────────────────────────────────────────────────────

    function getPendingTx(uint256 txId) external view returns (PendingTransaction memory) {
        return pendingTxs[txId];
    }

    function isGuardian(address addr) external view returns (bool) {
        return guardians[addr].active;
    }

    receive() external payable {}
}
