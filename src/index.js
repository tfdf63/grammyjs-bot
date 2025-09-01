const TelegramBot = require('./bot')

async function main() {
	try {
		// Создаем экземпляр бота
		const bot = new TelegramBot()

		// Сохраняем в глобальную переменную для graceful shutdown
		global.bot = bot

		// Запускаем бота
		await bot.start()
	} catch (error) {
		console.error('❌ Ошибка при запуске приложения:', error)
		console.error('Stack trace:', error.stack)
		process.exit(1)
	}
}

// Запускаем приложение
main()
