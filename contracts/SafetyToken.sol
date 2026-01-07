// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

/**
 * @title SafetyToken
 * @dev 女性安全地图社区代币 - 用于奖励社区贡献者
 */
contract SafetyToken {
    string public name = "Safety Token";
    string public symbol = "SAFE";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    address public owner;
    address public rewardContract; // 奖励合约地址（SafetyReview）
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyRewardContract() {
        require(msg.sender == rewardContract, "Only reward contract can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        totalSupply = 1000000 * 10**uint256(decimals); // 初始供应量：100万个代币
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    /**
     * @dev 设置奖励合约地址（只能由所有者调用一次）
     */
    function setRewardContract(address _rewardContract) public onlyOwner {
        require(rewardContract == address(0), "Reward contract already set");
        rewardContract = _rewardContract;
    }
    
    /**
     * @dev 转账代币
     */
    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }
    
    /**
     * @dev 授权转账
     */
    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }
    
    /**
     * @dev 授权转账
     */
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "Insufficient allowance");
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        emit Transfer(_from, _to, _value);
        return true;
    }
    
    /**
     * @dev 铸造代币（仅合约所有者可以调用）
     */
    function mint(address _to, uint256 _amount) public onlyOwner {
        totalSupply += _amount;
        balanceOf[_to] += _amount;
        emit Transfer(address(0), _to, _amount);
    }
    
    /**
     * @dev 奖励代币给用户（仅奖励合约可以调用）
     */
    function reward(address _to, uint256 _amount) public onlyRewardContract {
        require(totalSupply + _amount <= 10000000 * 10**uint256(decimals), "Maximum supply exceeded");
        totalSupply += _amount;
        balanceOf[_to] += _amount;
        emit Transfer(address(0), _to, _amount);
    }
}

