const { botCommands } = require('../config/constants')

class CommonHandler {
	/**
	 * Обработка команды /start
	 * @param {Object} ctx - Контекст Telegram
	 */
	async handleStartCommand(ctx) {
		await ctx.react('👍')
		await ctx.reply(
			'Привет! Я - бот ФК "Акрон". Молодой и звонкий! <span class="tg-spoiler">Хорошего дня!</span>\n\n' +
				'🎯 Также я умею создавать QR-коды с UTM метками для отслеживания переходов.\n\n' +
				'Доступные команды:\n' +
				'/tickets - Информация о билетах\n' +
				'/qrcode - Создать QR-код с UTM меткой',
			{
				parse_mode: 'HTML',
				disable_web_page_preview: true,
			}
		)
	}

	/**
	 * Обработка ругательств
	 * @param {Object} ctx - Контекст Telegram
	 */
	async handleSwearing(ctx) {
		await ctx.reply('Ругаемся?')
	}

	/**
	 * Установка команд бота
	 * @param {Object} bot - Экземпляр бота
	 */
	async setupCommands(bot) {
		await bot.api.setMyCommands(botCommands)
	}
}

module.exports = CommonHandler
