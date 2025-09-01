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

		// Не завершаем процесс сразу, даем время на graceful shutdown
		if (global.bot) {
			try {
				await global.bot.stop()
			} catch (stopError) {
				console.error('Ошибка при остановке бота:', stopError)
			}
		}

		// Ждем немного перед завершением
		setTimeout(() => {
			process.exit(1)
		}, 5000)
	}
}

// Запускаем приложение
main()
