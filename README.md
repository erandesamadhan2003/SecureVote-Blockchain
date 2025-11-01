# SecureVote - Blockchain E-Voting DApp

A decentralized voting platform built on Ethereum blockchain that ensures transparent, secure, and tamper-proof elections with role-based access control.

## Features

- **Immutable Blockchain Records**: Once a vote is cast, it cannot be altered or deleted
- **Role-Based Access Control (RBAC)**: Four distinct roles - Super Admin, Election Manager, Election Authority, and Voter
- **Transparent Results**: Real-time vote counting with complete audit trail
- **Decentralized Architecture**: No single point of failure or control
- **Smart Contract Security**: Built with OpenZeppelin's battle-tested contracts
- **Complete Election Lifecycle**: From creation to result declaration

## Architecture

### Smart Contracts
- **Roles.sol**: Manages role-based permissions using OpenZeppelin AccessControl
- **Election.sol**: Handles election lifecycle, candidate registration, and voting
- **ElectionFactory.sol**: Creates and manages multiple election instances

### Backend
- **Node.js + Express**: RESTful API server
- **MongoDB**: Off-chain data storage for user profiles and election metadata
- **Ethers.js**: Blockchain interaction and transaction handling
- **JWT Authentication**: Wallet-based user authentication

### Frontend
- **React + Vite**: Modern, fast development experience
- **Redux Toolkit**: Global state management
- **TailwindCSS + ShadCN UI**: Beautiful, responsive design
- **Ethers.js**: Web3 wallet integration

## Tech Stack

**Blockchain:**
- Solidity ^0.8.28
- Hardhat
- OpenZeppelin Contracts
- Ethers.js v5.7.2
- Sepolia Testnet

**Backend:**
- Node.js
- Express.js
- MongoDB
- JWT
- Ethers.js

**Frontend:**
- React 18
- Vite
- Redux Toolkit
- TailwindCSS
- ShadCN UI

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or Atlas)
- MetaMask browser extension
- Git

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/erandesamadhan2003/SecureVote-Blockchain.git
cd SecureVote-Blockchain
```

### 2. Blockchain Setup

#### Install Dependencies
```bash
cd blockchain
npm install
```

#### Configure Environment Variables
Create a `.env` file in the `blockchain` directory:

```properties
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
API_KEY=YOUR_INFURA_API_KEY
PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

**How to get these values:**
- **SEPOLIA_URL & API_KEY**: Create a free account at [Infura](https://infura.io/) and create a new project
- **PRIVATE_KEY**: Export from MetaMask (Account Details → Export Private Key) ⚠️ Never share this!
- **ETHERSCAN_API_KEY**: Get from [Etherscan](https://etherscan.io/myapikey)

#### Get Sepolia Test ETH
Get free test ETH from these faucets:
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)

#### Compile Contracts
```bash
npx hardhat compile
```

#### Deploy Contracts to Sepolia
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

**Save the deployed contract addresses!** You'll need them for backend and frontend configuration.

#### Verify Contracts (Optional)
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### 3. Backend Setup

#### Install Dependencies
```bash
cd ../backend
npm install
```

#### Configure Environment Variables
Create a `.env` file in the `backend` directory:

```properties
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/securevote
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/securevote

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=securevotejwtsecretkey
JWT_EXPIRES_IN=7d

# Blockchain Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
ROLES_CONTRACT_ADDRESS=YOUR_DEPLOYED_ROLES_CONTRACT_ADDRESS
ELECTION_FACTORY_CONTRACT_ADDRESS=YOUR_DEPLOYED_FACTORY_CONTRACT_ADDRESS

# Admin Wallet Private Key
ADMIN_PRIVATE_KEY=YOUR_ADMIN_WALLET_PRIVATE_KEY
```

**Note:** Replace `YOUR_DEPLOYED_*_ADDRESS` with addresses from step 2 deployment.

#### Setup MongoDB

**Option 1: Local MongoDB**
```bash
# Install MongoDB
# macOS: brew install mongodb-community
# Ubuntu: sudo apt-get install mongodb
# Windows: Download from mongodb.com

# Start MongoDB
mongod
```

**Option 2: MongoDB Atlas (Cloud)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string and update `MONGODB_URI`

#### Start Backend Server
```bash
npm run dev
```

Server will run on `http://localhost:3000`

### 4. Frontend Setup

#### Install Dependencies
```bash
cd ../frontend
npm install
```

#### Configure Environment Variables
Create a `.env.local` file in the `frontend` directory:

```properties
VITE_API_URL=http://localhost:3000/api
VITE_SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
VITE_CHAIN_ID=11155111
VITE_ROLES_CONTRACT=YOUR_DEPLOYED_ROLES_CONTRACT_ADDRESS
VITE_FACTORY_CONTRACT=YOUR_DEPLOYED_FACTORY_CONTRACT_ADDRESS
VITE_APP_NAME=SecureVote
```

#### Start Frontend Development Server
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`


## Security Features

- **Smart Contract Security**: Built with OpenZeppelin's audited contracts
- **Reentrancy Protection**: ReentrancyGuard on critical functions
- **Role-Based Access Control**: Granular permissions for different actions
- **Wallet Authentication**: Cryptographic signature verification
- **Immutable Records**: Blockchain ensures vote integrity
- **Private Key Protection**: Never expose private keys in frontend

## 🧪 Testing

### Run Smart Contract Tests
```bash
cd blockchain
npx hardhat test
```

### Run Backend Tests
```bash
cd backend
npm test
```


## 📝 Environment Variables Summary

### Blockchain (.env)
- `SEPOLIA_URL`: Infura Sepolia RPC URL
- `PRIVATE_KEY`: Deployer wallet private key
- `ETHERSCAN_API_KEY`: For contract verification

### Backend (.env)
- `MONGODB_URI`: MongoDB connection string
- `PORT`: Backend server port (default: 3000)
- `JWT_SECRET`: Secret for JWT tokens
- `SEPOLIA_RPC_URL`: Same as blockchain SEPOLIA_URL
- `ROLES_CONTRACT_ADDRESS`: Deployed Roles contract
- `ELECTION_FACTORY_CONTRACT_ADDRESS`: Deployed Factory contract
- `ADMIN_PRIVATE_KEY`: Admin wallet for transactions

### Frontend (.env.local)
- `VITE_API_URL`: Backend API endpoint
- `VITE_SEPOLIA_RPC`: Infura Sepolia RPC URL
- `VITE_CHAIN_ID`: 11155111 (Sepolia)
- `VITE_ROLES_CONTRACT`: Deployed Roles contract
- `VITE_FACTORY_CONTRACT`: Deployed Factory contract



##  Acknowledgments

- OpenZeppelin for secure smart contract libraries
- Hardhat for development environment
- Infura for Ethereum node infrastructure
- The Ethereum community
