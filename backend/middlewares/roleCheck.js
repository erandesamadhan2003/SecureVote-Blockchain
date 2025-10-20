import ContractService from '../utils/contractService.js';

// Role constants (should match your smart contract)
export const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ELECTION_MANAGER: 'ELECTION_MANAGER',
    ELECTION_AUTHORITY: 'ELECTION_AUTHORITY',
    VOTER: 'VOTER'
};

export const checkRole = (requiredRoles) => {
    return async (req, res, next) => {
        try {
            const userAddress = req.user.walletAddress;

            // Check if user has any of the required roles
            const hasRole = await ContractService.checkRole(userAddress, requiredRoles);

            if (!hasRole) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Required roles: ${requiredRoles.join(', ')}`
                });
            }

            next();
        } catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking user roles'
            });
        }
    };
};