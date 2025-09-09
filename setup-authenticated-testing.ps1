# Setup Script for Authenticated Lighthouse Testing
# This script installs required dependencies and sets up authenticated testing

Write-Host "🚀 Setting up Authenticated Lighthouse Testing..." -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan

# Check if Node.js is installed
Write-Host "`n🔍 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Install required packages
Write-Host "`n📦 Installing required packages..." -ForegroundColor Yellow
Write-Host "Installing puppeteer, lighthouse, and lighthouse-ci..." -ForegroundColor White

try {
    npm install puppeteer lighthouse @lhci/cli --save-dev
    Write-Host "✅ Packages installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error installing packages: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create configuration file
Write-Host "`n⚙️ Creating configuration file..." -ForegroundColor Yellow

$configContent = @"
{
  "loginCredentials": {
    "email": "your-email@example.com",
    "password": "your-password"
  },
  "baseUrl": "https://escrow-account-ledger.web.app",
  "protectedPages": [
    "/profile",
    "/user-settings", 
    "/new-party",
    "/party-report",
    "/party-ledger",
    "/final-trial-balance",
    "/account-ledger/Give",
    "/admin/dashboard"
  ],
  "outputDir": "./authenticated-lhci-report"
}
"@

$configContent | Out-File -FilePath "auth-test-config.json" -Encoding UTF8
Write-Host "✅ Configuration file created: auth-test-config.json" -ForegroundColor Green

# Create run script
Write-Host "`n📝 Creating run script..." -ForegroundColor Yellow

$runScriptContent = @"
const AuthenticatedLighthouseTester = require('./authenticated-lighthouse-test.js');
const fs = require('fs');

// Load configuration
let config;
try {
  config = JSON.parse(fs.readFileSync('auth-test-config.json', 'utf8'));
} catch (error) {
  console.error('❌ Error loading config. Please check auth-test-config.json');
  process.exit(1);
}

// Update the tester config
const CONFIG = {
  loginCredentials: config.loginCredentials,
  baseUrl: config.baseUrl,
  protectedPages: config.protectedPages,
  outputDir: config.outputDir,
  lighthouseOptions: {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    settings: {
      formFactor: 'mobile',
      screenEmulation: { mobile: true },
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1
      }
    }
  }
};

async function main() {
  const tester = new AuthenticatedLighthouseTester();
  
  try {
    await tester.init();
    
    const loginSuccess = await tester.login();
    if (!loginSuccess) {
      console.log('❌ Cannot proceed without successful login');
      console.log('💡 Please check your credentials in auth-test-config.json');
      return;
    }
    
    const results = await tester.runAllTests();
    await tester.generateSummaryReport(results);
    
    console.log('✅ Authenticated Lighthouse testing completed!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await tester.cleanup();
  }
}

main().catch(console.error);
"@

$runScriptContent | Out-File -FilePath "run-authenticated-test.js" -Encoding UTF8
Write-Host "✅ Run script created: run-authenticated-test.js" -ForegroundColor Green

# Create instructions
Write-Host "`n📋 Setup Instructions:" -ForegroundColor Magenta
Write-Host "1. Edit auth-test-config.json and add your login credentials" -ForegroundColor White
Write-Host "2. Run: node run-authenticated-test.js" -ForegroundColor White
Write-Host "3. View reports in ./authenticated-lhci-report/" -ForegroundColor White

Write-Host "`n⚠️ Important Notes:" -ForegroundColor Yellow
Write-Host "• Make sure you have valid login credentials" -ForegroundColor White
Write-Host "• The script will open a browser window (you can watch the process)" -ForegroundColor White
Write-Host "• Reports will be saved as HTML files for detailed analysis" -ForegroundColor White

Write-Host "`n✅ Setup completed successfully!" -ForegroundColor Green
Write-Host "📁 Files created:" -ForegroundColor Cyan
Write-Host "   • auth-test-config.json (edit with your credentials)" -ForegroundColor White
Write-Host "   • run-authenticated-test.js (run this to start testing)" -ForegroundColor White
Write-Host "   • authenticated-lighthouse-test.js (main testing module)" -ForegroundColor White
