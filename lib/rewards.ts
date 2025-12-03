import Reward from '@/models/reward';
import RewardTransaction from '@/models/rewardTransaction';
import RewardConfig from '@/models/rewardConfig';
import connectDB from './db';

/**
 * Get the active reward configuration
 */
export async function getRewardConfig() {
    await connectDB();
    const config = await RewardConfig.findOne({ isActive: true }).lean();
    return config;
}

/**
 * Get or create user's reward account
 */
export async function getOrCreateReward(userId: string) {
    await connectDB();
    let reward = await Reward.findOne({ userId });
    if (!reward) {
        reward = new Reward({ userId });
        await reward.save();
    }
    return reward;
}

/**
 * Calculate rewards for an order
 * Returns { eligible, points, reason }
 */
export async function calculateRewardsForOrder(
    userId: string,
    orderTotal: number
): Promise<{ eligible: boolean; points: number; reason?: string }> {
    await connectDB();

    const config = await getRewardConfig();
    if (!config) {
        return { eligible: false, points: 0, reason: 'Rewards system is not active' };
    }

    // Check minimum order value
    if (orderTotal < config.minOrderForReward) {
        return {
            eligible: false,
            points: 0,
            reason: `Minimum order value of ₹${config.minOrderForReward} required to earn rewards`,
        };
    }

    // TODO: Check eligibility based on order count when Order model is created
    // For now, assume eligible
    const eligible = true;

    if (!eligible) {
        return {
            eligible: false,
            points: 0,
            reason: `Complete ${config.eligibilityAfterOrders} orders to start earning rewards`,
        };
    }

    // Calculate points
    const pointsFromOrder = config.pointsPerOrder;
    const pointsFromAmount = Math.floor(orderTotal * config.pointsPerRupee);
    const totalPoints = pointsFromOrder + pointsFromAmount;

    return {
        eligible: true,
        points: totalPoints,
    };
}

/**
 * Award rewards to user (called after order completion)
 */
export async function awardRewards(
    userId: string,
    orderId: string,
    points: number,
    description: string
): Promise<void> {
    await connectDB();

    const reward = await getOrCreateReward(userId);

    // Update balance
    reward.balance += points;
    reward.lifetimeEarned += points;
    await reward.save();

    // Create transaction record
    const transaction = new RewardTransaction({
        rewardId: reward.rewardId,
        userId,
        type: 'earned',
        amount: points,
        orderId,
        description,
        balanceAfter: reward.balance,
    });
    await transaction.save();
}

/**
 * Redeem rewards (called during checkout)
 * Returns { success, discountAmount, message }
 */
export async function redeemRewards(
    userId: string,
    points: number,
    orderId?: string
): Promise<{ success: boolean; discountAmount: number; message?: string }> {
    await connectDB();

    const config = await getRewardConfig();
    if (!config) {
        return { success: false, discountAmount: 0, message: 'Rewards system is not active' };
    }

    const reward = await getOrCreateReward(userId);

    // Check if user has sufficient balance
    if (reward.balance < points) {
        return {
            success: false,
            discountAmount: 0,
            message: `Insufficient reward balance. Available: ${reward.balance} points`,
        };
    }

    // Check minimum redemption
    if (points < config.minRedemptionPoints) {
        return {
            success: false,
            discountAmount: 0,
            message: `Minimum ${config.minRedemptionPoints} points required for redemption`,
        };
    }

    // Calculate discount amount
    const discountAmount = Math.floor(points / config.redemptionRate);

    // Deduct points
    reward.balance -= points;
    reward.lifetimeRedeemed += points;
    await reward.save();

    // Create transaction record
    const transaction = new RewardTransaction({
        rewardId: reward.rewardId,
        userId,
        type: 'redeemed',
        amount: -points, // Negative for redemption
        orderId: orderId || null,
        description: `Redeemed ${points} points for ₹${discountAmount} discount`,
        balanceAfter: reward.balance,
    });
    await transaction.save();

    return {
        success: true,
        discountAmount,
        message: `Successfully redeemed ${points} points for ₹${discountAmount} discount`,
    };
}

/**
 * Check if user is eligible for rewards
 */
export async function checkEligibility(userId: string): Promise<boolean> {
    await connectDB();

    const config = await getRewardConfig();
    if (!config) return false;

    // TODO: Check order count when Order model is created
    // For now, return true
    return true;
}

/**
 * Get user's reward balance
 */
export async function getUserRewardBalance(userId: string): Promise<number> {
    await connectDB();
    const reward = await getOrCreateReward(userId);
    return reward.balance;
}

/**
 * Admin: Adjust user reward balance
 */
export async function adjustRewardBalance(
    userId: string,
    amount: number,
    reason: string
): Promise<void> {
    await connectDB();

    const reward = await getOrCreateReward(userId);

    // Update balance
    reward.balance = Math.max(0, reward.balance + amount);
    if (amount > 0) {
        reward.lifetimeEarned += amount;
    } else {
        reward.lifetimeRedeemed += Math.abs(amount);
    }
    await reward.save();

    // Create transaction record
    const transaction = new RewardTransaction({
        rewardId: reward.rewardId,
        userId,
        type: 'adjusted',
        amount,
        description: reason,
        balanceAfter: reward.balance,
    });
    await transaction.save();
}
