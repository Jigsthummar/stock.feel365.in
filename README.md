📦 FEEL365 Ultra Stock — Inventory Management PWA
A modern, offline-first Progressive Web App for inventory stock management
Built with HTML, CSS, JavaScript, and localStorage — no backend required
✨ Features
🔐 Security & Privacy
Idle Lock: Auto-locks after 2 minutes of inactivity
PIN Protection: Unlock with 5544
Data Persistence: All data stored securely in localStorage
Right-Click Disabled: Prevents casual inspection (oncontextmenu="return false")
No External APIs: 100% offline, no tracking
📱 User Experience
Fully Responsive: Works on Android & iOS mobile devices
PWA Ready: Installable via "Add to Home Screen"
Dark Theme: Modern UI with purple gradient accents
Smooth Animations: Slide-in cards, pulsing low-stock alerts
Custom Cursor: Hand cursor on interactive elements (desktop only)
⌨️ Keyboard Shortcuts (Desktop)
Action
Shortcut
New Sale
Alt + S
Refill Stock
Alt + A
Inventory Control
Alt + I
Report Damage
Alt + D
History
Alt + H
Returns & Exchanges
Alt + R
Create New Product
Alt + N
WhatsApp Support
Alt + W
Dashboard
Alt + Home
💡 Tooltips show shortcuts on hover
📊 Inventory Management
Product Registry: Add products with name, category, and low-stock threshold
Per-Product Categories: e.g., Suz_1 - Black, Suz_1 - Brown
Low-Stock Alerts: Visual pulse animation when stock ≤ threshold
Edit Products: Change category/threshold without data loss
Delete Products: Full history removal with confirmation
📥 Stock Operations
Add Stock: Refill existing products
New Sale: Process sales with real-time stock validation
Returns: Accept returns with sale history validation
Damage Reports: Record losses with stock validation
📈 Dashboard Insights
Total Products count
Sales Today counter
Collapsible "Stock by Category" card:
Shows total units per category
Smooth expand/collapse animation
Auto-collapses after 20 seconds or when leaving Dashboard
📤 Data Management
Auto Backup Reminder: Alerts if backup >7 days old
Export Backup: Download full data as JSON
Import Backup: Restore from JSON file
Hard Refresh: Clear cache + reload latest version (no data loss)
📲 Communication
WhatsApp Integration:
Header button (Alt + W)
Stock report (Inventory Summary)
Ledger report (Daily Transactions)
Instagram Link: Direct to @official.jignesh.1
🔒 Lock Screen
Branded UI: FEEL365 logo + footer credit
Social Icons: WhatsApp + Instagram
Moving Glow Border: Animated purple-to-pink gradient
Error Handling: Clear instructions for wrong PIN
🛠️ Technical Details
Architecture
Frontend: Vanilla JavaScript (no frameworks)
Storage: localStorage with structured data model
State Management: In-memory Map objects synced to localStorage
UI Framework: Custom CSS with dark theme variables
Data Model
js
12345678
{
  products: Map { "Suz_1" => 100 },
  productCategories: Map { "Suz_1" => "Black" },
  productLowStockThresholds: Map { "Suz_1" => 5 },
  transactions: [
    { date: "2026-02-03", product: "Suz_1", qty: 10, type: "ADD" }
  ]
}
Key Files
File
Purpose
index.html
Main UI structure
js/db.js
Data storage layer
js/ui.js
All interactivity logic
sw.js
Service worker for PWA caching
Security Notes
PIN Hardcoded: Suitable for personal use (not enterprise)
No Server Sync: Data never leaves your device
Local Storage Only: No cookies or external storage
🚀 How to Use
First Time Setup
Open the app in Chrome/Safari
Click "Add to Home Screen" (mobile) or bookmark (desktop)
Start adding products via "Create New Product"
Daily Workflow
Refill Stock: Alt + A → Select product → Enter quantity
Process Sale: Alt + S → Select product → Enter quantity
Check Low Stock: Dashboard shows pulsing items
Generate Reports: WhatsApp buttons in Stock/Ledger views
Maintenance
Weekly: Export backup via "Export" button
After Update: Use "Hard Refresh" (🔄 button) to load new version
Forgot PIN: Contact via WhatsApp from lock screen
📱 Mobile Optimization
Touch-Friendly: Large buttons, no hover states
Keyboard Shortcuts: Disabled on mobile (no effect)
Auto-Lock: Protects data when phone is idle
Installable: Runs like a native app from home screen
🧪 Troubleshooting
Issue
Solution
Product not deleting
Ensure you're using latest ui.js with global currentDeleteProduct
WhatsApp emojis broken
Uses plain text (no markdown) for compatibility
Custom cursor not working
Falls back to default arrow on mobile/Safari
Stock preview not updating
Fixed with refreshStockPreviews() after transactions
Collapsible card not loading
Uses getComputedStyle() for accurate state detection
👨‍💻 Developer Info
Built By
Jignesh Thummar
📍 Surat, Gujarat, India
📱 WhatsApp: +91 98255 31314
📸 Instagram: @official.jignesh.1
Tech Stack
Languages: HTML5, CSS3, JavaScript (ES6+)
Libraries: None (vanilla JS only)
Icons: Font Awesome 6.5.0
Fonts: Outfit (Google Fonts)
Deployment: Static hosting (GoDaddy domain: feel365.in)
License
Free & Open Source: For personal and commercial use
Credit Required: Footer must show "Crafted with ❤️ by Jignesh Thummar 2025–26"
FEEL365 Ultra Stock — Your complete offline inventory solution
Version: 1.0 (February 2026)
Domain: feel365.in
