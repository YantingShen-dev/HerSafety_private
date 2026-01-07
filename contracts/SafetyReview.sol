// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

// 引入代币合约接口
interface ISafetyToken {
    function reward(address _to, uint256 _amount) external;
    function balanceOf(address _account) external view returns (uint256);
}

/**
 * @title SafetyReview
 * @dev 女性安全地图评价数据上链合约（带代币奖励功能）
 */
contract SafetyReview {
    ISafetyToken public safetyToken;
    uint256 public constant REWARD_AMOUNT = 1 * 10**18; // 1个代币奖励（18位小数）
    uint256 public constant NEW_USER_REWARD = 100 * 10**18; // 新用户注册奖励：100个代币（18位小数）
    
    mapping(address => bool) public registeredUsers; // 跟踪已注册的用户
    
    struct Review {
        uint256 id;                    // 评价ID（对应数据库ID）
        string address_text;            // 地址文本
        int256 latitude;                // 纬度（乘以1000000存储，避免浮点数）
        int256 longitude;               // 经度（乘以1000000存储，避免浮点数）
        string province;                // 省份
        string city;                    // 城市
        string district;                // 区县
        uint8 night_lighting;           // 夜间照明评分 0-5
        uint8 security_status;          // 治安状况评分 0-5
        uint8 female_density;           // 女性数量评分 0-5
        uint8 overall_safety;           // 总体安全评分 0-5
        string text_review;             // 文字评价
        string ai_summary;              // AI总结
        string keywords;                // 关键词（逗号分隔）
        address submitter;              // 提交者地址
        uint256 timestamp;              // 提交时间戳
    }
    
    Review[] private reviews;
    
    // 事件
    event ReviewSubmitted(
        uint256 indexed reviewId,
        address indexed submitter,
        string address_text,
        int256 latitude,
        int256 longitude,
        uint256 timestamp
    );
    
    event TokenRewarded(
        address indexed recipient,
        uint256 amount,
        uint256 indexed reviewId
    );
    
    event NewUserRegistered(
        address indexed user,
        uint256 rewardAmount
    );
    
    event UserLoggedIn(
        address indexed user,
        bool isNewUser
    );
    
    /**
     * @dev 构造函数，设置代币合约地址
     */
    constructor(address _tokenAddress) {
        safetyToken = ISafetyToken(_tokenAddress);
    }
    
    /**
     * @dev 用户注册/登录函数（在连接钱包时调用）
     * 如果是新用户，自动发放100代币注册奖励
     * @return isNewUser 是否是新用户
     */
    function registerOrLogin() public returns (bool) {
        bool isNewUser = !registeredUsers[msg.sender];
        
        if (isNewUser) {
            // 标记为已注册
            registeredUsers[msg.sender] = true;
            
            // 发放新用户注册奖励（100个代币）
            try safetyToken.reward(msg.sender, NEW_USER_REWARD) {
                emit NewUserRegistered(msg.sender, NEW_USER_REWARD);
            } catch {
                // 如果注册奖励失败，回滚注册状态
                registeredUsers[msg.sender] = false;
                revert("Failed to reward new user");
            }
        }
        
        emit UserLoggedIn(msg.sender, isNewUser);
        return isNewUser;
    }
    
    /**
     * @dev 提交安全评价（带代币奖励）
     * @param _id 评价ID（数据库ID）
     * @param _address 地址
     * @param _latitude 纬度（乘以1000000后传入）
     * @param _longitude 经度（乘以1000000后传入）
     * @param _province 省份
     * @param _city 城市
     * @param _district 区县
     * @param _night_lighting 夜间照明评分
     * @param _security_status 治安状况评分
     * @param _female_density 女性数量评分
     * @param _overall_safety 总体安全评分
     * @param _text_review 文字评价
     * @param _ai_summary AI总结
     * @param _keywords 关键词
     */
    function submitReview(
        uint256 _id,
        string memory _address,
        int256 _latitude,
        int256 _longitude,
        string memory _province,
        string memory _city,
        string memory _district,
        uint8 _night_lighting,
        uint8 _security_status,
        uint8 _female_density,
        uint8 _overall_safety,
        string memory _text_review,
        string memory _ai_summary,
        string memory _keywords
    ) public {
        require(_night_lighting <= 5, "Night lighting score must be between 0-5");
        require(_security_status <= 5, "Security status score must be between 0-5");
        require(_female_density <= 5, "Female density score must be between 0-5");
        require(_overall_safety <= 5, "Overall safety score must be between 0-5");
        
        // 创建结构体，分步赋值以减少堆栈深度
        Review memory newReview;
        newReview.id = _id;
        newReview.address_text = _address;
        newReview.latitude = _latitude;
        newReview.longitude = _longitude;
        newReview.province = _province;
        newReview.city = _city;
        newReview.district = _district;
        newReview.night_lighting = _night_lighting;
        newReview.security_status = _security_status;
        newReview.female_density = _female_density;
        newReview.overall_safety = _overall_safety;
        newReview.text_review = _text_review;
        newReview.ai_summary = _ai_summary;
        newReview.keywords = _keywords;
        newReview.submitter = msg.sender;
        newReview.timestamp = block.timestamp;
        
        reviews.push(newReview);
        
        emit ReviewSubmitted(
            _id,
            msg.sender,
            _address,
            _latitude,
            _longitude,
            block.timestamp
        );
        
        // 确保用户已注册（如果还未注册，先注册）
        if (!registeredUsers[msg.sender]) {
            registeredUsers[msg.sender] = true;
            // 注意：这里不再发放注册奖励，因为应该在登录时发放
            // 但如果用户跳过了登录直接提交评价，这里也不发放奖励（按需求）
        }
        
        // 发放评论奖励（1个代币）
        try safetyToken.reward(msg.sender, REWARD_AMOUNT) {
            emit TokenRewarded(msg.sender, REWARD_AMOUNT, _id);
        } catch {
            // 如果代币奖励失败，不影响评价提交
            // 这在生产环境中可能需要记录日志
        }
    }
    
    /**
     * @dev 获取评价总数
     */
    function getReviewCount() public view returns (uint256) {
        return reviews.length;
    }
    
    /**
     * @dev 根据索引获取评价
     */
    function getReview(uint256 _index) public view returns (Review memory) {
        require(_index < reviews.length, "Index out of range");
        return reviews[_index];
    }
    
    /**
     * @dev 获取所有评价
     */
    function getAllReviews() public view returns (Review[] memory) {
        return reviews;
    }
    
    /**
     * @dev 根据数据库ID查找评价
     */
    function getReviewById(uint256 _id) public view returns (Review memory, bool) {
        for (uint256 i = 0; i < reviews.length; i++) {
            if (reviews[i].id == _id) {
                return (reviews[i], true);
            }
        }
        Review memory empty;
        return (empty, false);
    }
    
    /**
     * @dev 获取用户的代币余额
     */
    function getUserTokenBalance(address _user) public view returns (uint256) {
        return safetyToken.balanceOf(_user);
    }
    
    /**
     * @dev 检查用户是否已注册
     */
    function isUserRegistered(address _user) public view returns (bool) {
        return registeredUsers[_user];
    }
}

