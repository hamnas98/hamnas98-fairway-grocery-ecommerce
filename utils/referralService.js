const Referral = require('../models/Referral');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const crypto = require('crypto');

class ReferralService {
    static async generateReferralCode(userId) {
        // Check if user already has a referral code
        let referral = await Referral.findOne({ referredBy: userId });
        
        if (!referral) {
            // Generate a unique referral code
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            
            // Create new referral document
            referral = await Referral.create({
                code,
                referredBy: userId,
                referredUsers: [],
                totalEarnings: 0
            });
        }

        return referral.code;
    }

    static async processReferral(referralCode, newUserId) {
        const referral = await Referral.findOne({ code: referralCode });
        if (!referral) {
            throw new Error('Invalid referral code');
        }

        // Check if user was already referred
        const existingReferral = await Referral.findOne({
            'referredUsers.user': newUserId
        });

        if (existingReferral) {
            throw new Error('User already referred');
        }

        // Add new user to referrer's referred users
        referral.referredUsers.push({
            user: newUserId,
            joinedAt: new Date(),
            purchaseCompleted: false,
            rewardClaimed: false
        });

        // Create referral code for new user
        await this.generateReferralCode(newUserId);

        await referral.save();
        return true;
    }

    static async processFirstPurchaseReward(userId) {
        // Find the referral where this user is listed in referredUsers
        const referral = await Referral.findOne({
            'referredUsers.user': userId
        });

        if (!referral) {
            return false;
        }

        const referredUserIndex = referral.referredUsers.findIndex(
            ref => ref.user.toString() === userId
        );

        if (referredUserIndex === -1 || 
            referral.referredUsers[referredUserIndex].rewardClaimed) {
            return false;
        }

        // Update referred user status
        referral.referredUsers[referredUserIndex].purchaseCompleted = true;
        referral.referredUsers[referredUserIndex].rewardClaimed = true;

        // Add rewards to both users' wallets
        const REFERRER_REWARD = 100; // ₹100 for referrer
        const REFERRED_REWARD = 50;  // ₹50 for referred user

        // Add to referrer's wallet
        await Wallet.findOneAndUpdate(
            { user: referral.referredBy },
            { 
                $inc: { balance: REFERRER_REWARD },
                $push: {
                    transactions: {
                        type: 'credit',
                        amount: REFERRER_REWARD,
                        description: 'Referral reward for new user first purchase'
                    }
                }
            },
            { upsert: true }
        );

        // Add to referred user's wallet
        await Wallet.findOneAndUpdate(
            { user: userId },
            {
                $inc: { balance: REFERRED_REWARD },
                $push: {
                    transactions: {
                        type: 'credit',
                        amount: REFERRED_REWARD,
                        description: 'Welcome reward for using referral code'
                    }
                }
            },
            { upsert: true }
        );

        // Update total earnings
        referral.totalEarnings += REFERRER_REWARD;
        await referral.save();

        return true;
    }

    static async getReferralStats(userId) {
        const referral = await Referral.findOne({ referredBy: userId })
            .populate('referredUsers.user', 'name email')
            .populate('referredBy', 'name email');

        if (!referral) {
            // If no referral exists, create one
            const newReferral = await this.generateReferralCode(userId);
            return {
                referralCode: newReferral,
                totalEarnings: 0,
                referredUsers: []
            };
        }

        return {
            referralCode: referral.code,
            totalEarnings: referral.totalEarnings,
            referredUsers: referral.referredUsers.map(ref => ({
                user: {
                    name: ref.user.name,
                    email: ref.user.email
                },
                joinedAt: ref.joinedAt,
                purchaseCompleted: ref.purchaseCompleted,
                rewardClaimed: ref.rewardClaimed
            }))
        };
    }
}

module.exports = ReferralService;