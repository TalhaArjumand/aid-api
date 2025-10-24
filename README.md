


# 💫 AidChain Backend (CHATS API)

A **Node.js-based backend system** powering the AidChain ecosystem — a decentralized humanitarian aid transfer solution built on blockchain technology (Hyperledger Besu).  
This service connects the off-chain world (NGOs, Vendors, Beneficiaries) to the blockchain network through APIs, message queues, and a PostgreSQL database.

---

## 🧱 Core Purpose

AidChain enables **transparent, tamper-proof, and automated fund distribution** between:
- NGOs & Campaigns  
- Beneficiaries & Vendors  
- Admins & Field Agents  

It ensures traceability of every aid disbursement through blockchain-backed smart contracts.

---

## 🏗️ System Architecture

┌────────────────────────────┐
│  Admin / NGO Frontend      │
│  (Nuxt 3 Web App)          │
└────────────┬───────────────┘
│ REST API
┌────────────▼───────────────┐
│  AidChain Backend (This)   │
│  Node.js + Express + Sequelize │
│  PostgreSQL + RabbitMQ + BlockchainService │
└────────────┬───────────────┘
│ Queue Messages
┌────────────▼───────────────┐
│  AidChain Blockchain       │
│  (Hyperledger Besu + QBFT) │
│  Smart Contracts via ethers.js │
└────────────────────────────┘

---

## ⚙️ Tech Stack

| Component | Description |
|------------|-------------|
| **Node.js + Express** | Backend RESTful API framework |
| **Sequelize ORM** | Database modeling and migrations |
| **PostgreSQL** | Relational database for persistent data |
| **RabbitMQ** | Asynchronous message queue for blockchain transactions |
| **BlockchainService (ethers.js)** | Connects to AidChain Besu blockchain |
| **Docker Compose** | Multi-container orchestration |
| **JWT + Bcrypt** | Secure authentication & authorization |

---

## 🧩 Major Modules

| Module | Description |
|--------|-------------|
| **AuthController.js** | Handles login, signup, and JWT token generation |
| **OrganisationController.js** | Manages NGOs, campaigns, and members |
| **CampaignController.js** | Adds beneficiaries, disburses tokens |
| **BlockchainService.js** | Interacts with Besu blockchain using ethers.js |
| **QueueService.js** | Publishes tasks to RabbitMQ (e.g., mint, approve, fund) |
| **TransactionConsumer.js** | Consumes blockchain-related jobs asynchronously |
| **WalletService.js** | Creates and manages wallets for users, NGOs, and campaigns |

---

## 🪄 Key RabbitMQ Queues

| Queue Name | Purpose |
|-------------|----------|
| `approveOneBeneficiary` | Approve blockchain spending for a beneficiary |
| `FUND_BENEFICIARY` | Disburse AidTokens to beneficiary wallets |
| `mintNFTFunc` | Mint NFTs for verified transactions |
| `FundVendor` | Handle vendor order funding |
| `ConfirmTransaction` | Confirm pending blockchain transactions |
| `GasIncreaseQueue` | Retry transactions stuck due to low gas |

---

## 🗃️ Database Schema Overview

Key tables created via Sequelize migrations:
- **Users** (role-based: NGO, Vendor, Beneficiary, Admin)  
- **Organisations** (NGOs registered in the system)  
- **Campaigns** (aid distribution programs)  
- **Wallets** (unique addresses mapped to blockchain wallets)  
- **Transactions** (blockchain operations logged locally)  
- **OrganisationMembers**, **Vendors**, **Beneficiaries**

---

## 📦 Installation Guide

### 🧰 Prerequisites
Ensure you have installed:
```bash
Node.js >= 14
PostgreSQL
RabbitMQ
Docker (optional)
Redis (for caching, optional)


⸻

🧑‍💻 Local Setup

# Clone repository
git clone https://github.com/TalhaArjumand/chats-api.git
cd chats-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Create database
npx sequelize-cli db:create

# Run migrations
npx sequelize-cli db:migrate

# (Optional) Seed data
npx sequelize-cli db:seed:all


⸻

🧱 Run Application

Development Mode:

npm run dev

Production Mode:

npm start

Start Consumers:

npm run start:consumer

Development Consumers:

npm run start:consumer:dev


⸻

🐳 Run with Docker Compose

# Build and start all services
docker-compose up --build

# Create persistent volume for PostgreSQL
docker volume create postgres


⸻

⚙️ Environment Variables

Below is an example .env configuration:

PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=aidchain
RABBITMQ_URL=amqp://localhost
BLOCKCHAIN_RPC=http://127.0.0.1:8545
PRIVATE_KEY=0x<private-key>
TOKEN_CONTRACT=0x<token-address>
OPS_CONTRACT=0x<ops-address>
ESCROW_CONTRACT=0x<escrow-address>
JWT_SECRET=supersecretkey


⸻

🔐 Authentication Flow
	•	Admins and NGOs authenticate using JWT tokens.
	•	Each user’s wallet is linked via the Wallets table.
	•	API routes use middleware for authentication & role validation.

⸻

🧩 Example API Endpoints

Endpoint	Description	Method
/v1/auth/login	User login	POST
/v1/organisations	Create NGO organisation	POST
/v1/campaigns	Create a campaign	POST
/v1/campaigns/:id/beneficiaries	Add beneficiary to campaign	POST
/v1/utils/test-blockchain	Test blockchain connection	GET


⸻

🔁 Developer Workflow

# Create new branch
git checkout -b feature/<branch-name>

# Push changes
git add .
git commit -m "Implement feature X"
git push origin feature/<branch-name>

Follow Git flow for merging into FYP or main.

⸻

📬 Contribution Guidelines
	•	Avoid pushing .env or private keys.
	•	Always test consumer scripts before pushing.
	•	Maintain clean, well-documented commits.
	•	Follow existing linting and formatting rules.

⸻

🧠 Credits

Developed by Team AidChain
Mentored under the FAST-NUCES Blockchain Systems Lab


“Blockchain is not the goal — transparency is.”
— AidChain Engineering Team

