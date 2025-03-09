# Yahoo Proxy Toolkit

## ⚠️ Ethical Warning
This toolkit is strictly for authorized security research and testing. Unauthorized use is unethical and potentially illegal.

## Features
- Advanced proxy handling
- Telegram webhook integration
- Configurable domain targeting
- Secure logging
- Network security checks

## Prerequisites
- Node.js 22+
- Telegram Bot Token

## Installation
1. Clone the repository
2. Run `./setup.sh`
3. Configure `.env` file with your settings

## Configuration
- Edit `config/default.json` for global settings
- Edit `config/proxy-config.json` for proxy-specific settings
- Set Telegram bot token in `.env`

## Usage
- Start server: `npm start`
- Development mode: `npm run dev`

## Telegram Bot Commands
- `/start` - Show available commands
- `/getlink` - Get current proxy link
- `/changedomain <domain>` - Change target domain
- `/status` - Get proxy status

## Security Considerations
- Only use with explicit authorization
- Comply with all legal and ethical standards
- Protect sensitive information

## Disclaimer
For educational and research purposes only.