require('dotenv').config()

// Проверка обязательных переменных окружения
const requiredEnvVars = [
	'BOT_API_KEY',
	'BOT_TICKETS_LOGIN',
	'BOT_TICKETS_PASSWORD',
]

for (const envVar of requiredEnvVars) {
	if (!process.env[envVar]) {
		console.error(
			`❌ Ошибка: Отсутствует обязательная переменная окружения ${envVar}`
		)
		console.error('📝 Создайте файл .env с необходимыми переменными:')
		console.error('BOT_API_KEY=your_telegram_bot_token')
		console.error('BOT_TICKETS_LOGIN=your_login')
		console.error('BOT_TICKETS_PASSWORD=your_password')
		process.exit(1)
	}
}

module.exports = {
	bot: {
		token: process.env.BOT_API_KEY,
		channelId: process.env.CHANNEL_ID || '-1002396067751',
	},
	api: {
		baseUrl: 'https://api.tickets.yandex.net/api/crm/',
		login: process.env.BOT_TICKETS_LOGIN,
		password: process.env.BOT_TICKETS_PASSWORD,
		cityId: '3296193',
	},
	timezone: {
		offset: 4, // Самара UTC+4
	},
	qrCode: {
		defaultFormat: 'png',
		defaultSize: 512,
		quality: 0.92,
		margin: 1,
	},
	logging: {
		logsDir: './logs',
		telegramLogFile: 'telegram-bot.log',
	},
	scheduler: {
		reportHour: 11, // Время отправки отчета (по самарскому времени)
		checkInterval: 60 * 1000, // Интервал проверки (1 минута)
	},
}
