# 🏦 Account Ledger Management System

A comprehensive **React + TypeScript + Node.js** based account ledger management system with advanced features like Monday Final settlements, balance tracking, and complete CRUD operations.

## ✨ Features

### 🎯 Core Functionality
- **📊 Party Management** - Add, edit, delete parties with unique identifiers
- **💰 Ledger Entries** - Complete CRUD operations for financial transactions
- **⚖️ Balance Tracking** - Automatic balance calculation with continuity
- **📅 Monday Final Settlements** - Weekly consolidation with safety features
- **📋 Old Records** - Archive and manage historical transactions
- **🔍 Search & Filter** - Advanced search functionality across parties
- **📄 Reports** - DC Reports and Trial Balance generation
- **🖨️ Print Support** - Print ledgers and reports

### 🛡️ Safety Features
- **Double Confirmation** for Monday Final settlements
- **30-Second Undo** option for accidental settlements
- **Duplicate Prevention** for same-day settlements
- **Data Validation** at both frontend and backend
- **Error Handling** with user-friendly messages

### 🎨 User Experience
- **Modern UI** with Tailwind CSS
- **Responsive Design** for all devices
- **Real-time Updates** with toast notifications
- **Keyboard Shortcuts** for quick actions
- **Dark/Light Mode** support

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Shadcn/ui** for components

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose
- **JWT** for authentication
- **CORS** enabled
- **Helmet** for security

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- Git

### Frontend Setup
```bash
# Clone the repository
git clone <repository-url>
cd property-flow-design-main

# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend Setup
```bash
# Navigate to backend directory
cd Account-Ledger-Software-main

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure environment variables
# Edit .env file with your MongoDB connection string

# Start backend server
npm start
```

## ⚙️ Configuration

### Environment Variables (.env)
```env
# Backend Configuration
PORT=5000
MONGODB_URI=mongodb://localhost:27017/account-ledger
JWT_SECRET=your-secret-key
NODE_ENV=development

# Frontend Configuration (vite.config.ts)
VITE_API_BASE_URL=https://account-ledger-software.onrender.com/api
```

## 📖 Usage Guide

### 1. Party Management
```typescript
// Add new party
const newParty = {
  partyName: "ABC Company",
  srNo: "001",
  status: "Active"
};

// Search parties
const searchResults = await newPartyAPI.getAll({ search: "ABC" });
```

### 2. Ledger Entries
```typescript
// Add credit entry
const creditEntry = {
  partyName: "ABC Company",
  amount: 50000,
  remarks: "Payment received",
  transactionType: "CR"
};

// Add debit entry
const debitEntry = {
  partyName: "ABC Company", 
  amount: 10000,
  remarks: "Commission paid",
  transactionType: "DR"
};
```

### 3. Monday Final Settlement
```typescript
// Create Monday Final settlement
const settlement = {
  partyName: "ABC Company",
  tnsType: "Monday S...",
  credit: 50000,
  debit: 10000,
  balance: 40000,
  remarks: "Monday Final Settlement - 5 entries"
};
```

## 🔧 API Endpoints

### Party Management
- `GET /api/new-party` - Get all parties
- `POST /api/new-party` - Create new party
- `PUT /api/new-party/:id` - Update party
- `DELETE /api/new-party/:id` - Delete party

### Ledger Management
- `GET /api/party-ledger/parties` - Get all parties for ledger
- `GET /api/party-ledger/:partyName` - Get party ledger
- `POST /api/party-ledger/entry` - Add ledger entry
- `PUT /api/party-ledger/entry/:id` - Update ledger entry
- `DELETE /api/party-ledger/entry/:id` - Delete ledger entry

### Monday Final
- `PUT /api/party-ledger/monday-final` - Update Monday Final status

## 📊 Data Models

### Party Schema
```javascript
{
  partyName: String,      // Required
  srNo: String,          // Auto-generated
  status: String,        // Active/Inactive
  createdAt: Date,       // Auto-generated
  updatedAt: Date        // Auto-generated
}
```

### Ledger Entry Schema
```javascript
{
  partyName: String,     // Required
  date: String,         // DD/MM/YYYY format
  remarks: String,      // Transaction description
  tnsType: String,      // CR/DR/Monday S...
  credit: Number,       // Credit amount
  debit: Number,        // Debit amount (negative)
  balance: Number,      // Running balance
  chk: Boolean,         // Checkbox for selection
  ti: String,          // Transaction identifier
  mondayFinal: String,  // Yes/No
  createdAt: Date,     // Auto-generated
  updatedAt: Date      // Auto-generated
}
```

## 🎯 Key Features Explained

### Monday Final Settlement Process
1. **Confirmation Dialog** - Shows transaction summary
2. **Type "CONFIRM"** - Prevents accidental submissions
3. **Final Confirmation** - Double-check before proceeding
4. **Settlement Creation** - Consolidates all entries
5. **30-Second Undo** - Option to reverse the action
6. **Balance Continuity** - Maintains proper balance flow

### Balance Calculation Logic
```typescript
// Starting from last Monday Final settlement
let startingBalance = lastSettlement?.balance || 0;

// For each entry
const netEffect = creditAmount - debitAmount;
runningBalance = startingBalance + netEffect;

// Monday Final settlement
const settlementBalance = startingBalance + totalCredit - totalDebit;
```

## 🐛 Troubleshooting

### Common Issues

#### Frontend Issues
```bash
# Port already in use
npm run dev -- --port 3001

# Build errors
npm run build

# TypeScript errors
npm run type-check
```

#### Backend Issues
```bash
# MongoDB connection failed
# Check MongoDB service is running
mongod --dbpath /path/to/data

# Port already in use
# Change PORT in .env file
PORT=5001
```

#### Database Issues
```bash
# Reset database
mongo
use account-ledger
db.dropDatabase()

# Backup database
mongodump --db account-ledger --out ./backup
```

## 📝 Development

### Project Structure
```
property-flow-design-main/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Main application pages
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # API and utilities
│   └── main.tsx           # Application entry point
├── public/                # Static assets
└── package.json           # Dependencies and scripts

Account-Ledger-Software-main/
├── src/
│   ├── controllers/        # Request handlers
│   ├── models/            # Database schemas
│   ├── routes/            # API routes
│   ├── middlewares/       # Custom middlewares
│   └── config/            # Configuration files
└── server.js              # Server entry point
```

### Available Scripts
```bash
# Frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript check

# Backend
npm start            # Start production server
npm run dev          # Start development server
npm run test         # Run tests
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Commit Convention
```
feat: add new feature
fix: bug fix
docs: documentation update
style: code formatting
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Shadcn/ui** for beautiful components
- **Tailwind CSS** for utility-first styling
- **Vite** for fast development experience
- **MongoDB** for reliable database
- **Express.js** for robust backend framework

## 📞 Support

For support and questions:
- 📧 Email: support@accountledger.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 📖 Documentation: [Wiki](https://github.com/your-repo/wiki)

---

**Made with ❤️ for efficient account management**
