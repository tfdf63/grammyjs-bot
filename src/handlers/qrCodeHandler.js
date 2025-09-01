const { Keyboard, InputFile } = require('grammy')
const QRCodeService = require('../services/qrCodeService')
const ErrorHandler = require('../middleware/errorHandler')
const { isValidUrl, isValidUtmTag } = require('../utils/validators')
const { sessionStates, qrFormats } = require('../config/constants')

class QRCodeHandler {
	constructor(qrCodeService) {
		this.qrCodeService = qrCodeService
		this.errorHandler = new ErrorHandler()
	}

	/**
	 * Обработка команды /qrcode
	 * @param {Object} ctx - Контекст Telegram
	 */
	async handleQRCodeCommand(ctx) {
		ctx.session.step = sessionStates.WAITING_URL
		ctx.session.url = null
		ctx.session.utmTag = null
		ctx.session.finalUrl = null
		ctx.session.format = qrFormats.PNG

		await ctx.reply(
			'🔗 Отправьте ссылку, для которой нужно создать QR-код\n\n' +
				'Пример: https://example.com'
		)
	}

	/**
	 * Обработка текстовых сообщений для QR-кодов
	 * @param {Object} ctx - Контекст Telegram
	 */
	async handleTextMessage(ctx) {
		const step = ctx.session.step
		const text = ctx.message.text

		switch (step) {
			case sessionStates.WAITING_URL:
				await this.handleWaitingUrl(ctx, text)
				break
			case sessionStates.WAITING_URL_CONFIRMATION:
				await this.handleUrlConfirmation(ctx, text)
				break
			case sessionStates.WAITING_UTM:
				await this.handleWaitingUtm(ctx, text)
				break
			case sessionStates.WAITING_CONFIRMATION:
				await this.handleConfirmation(ctx, text)
				break
			default:
				return // Игнорируем сообщения вне процесса создания QR-кода
		}
	}

	/**
	 * Обработка ожидания URL
	 * @param {Object} ctx - Контекст Telegram
	 * @param {string} text - Текст сообщения
	 */
	async handleWaitingUrl(ctx, text) {
		if (!isValidUrl(text)) {
			await ctx.reply(
				'❌ Некорректная ссылка!\n\n' +
					'Пожалуйста, отправьте корректную ссылку, начинающуюся с http:// или https://'
			)
			return
		}

		ctx.session.url = text
		ctx.session.step = sessionStates.WAITING_URL_CONFIRMATION

		// Отправляем ссылку с превью для подтверждения
		await ctx.reply('🔗 Подтвердите ссылку:', {
			entities: [
				{
					type: 'url',
					offset: 0,
					length: text.length,
				},
			],
		})
		await ctx.reply(text, { link_preview_options: { is_disabled: true } })

		// Создаем клавиатуру с кнопками
		const keyboard = new Keyboard()
			.text('✅ Подтвердить')
			.text('✏️ Отредактировать')
			.resized()

		await ctx.reply('Выберите действие:', {
			reply_markup: keyboard,
		})
	}

	/**
	 * Обработка подтверждения URL
	 * @param {Object} ctx - Контекст Telegram
	 * @param {string} text - Текст сообщения
	 */
	async handleUrlConfirmation(ctx, text) {
		if (text === '✅ Подтвердить') {
			ctx.session.step = sessionStates.WAITING_UTM

			await ctx.reply(
				'🏷️ Теперь отправьте UTM метку для кампании\n\n' +
					'UTM метка должна быть без пробелов (используйте подчеркивания или дефисы)\n' +
					'Пример: summer_sale, promo2024, newsletter',
				{ reply_markup: { remove_keyboard: true } }
			)
		} else if (text === '✏️ Отредактировать') {
			ctx.session.step = sessionStates.WAITING_URL
			ctx.session.url = null

			await ctx.reply(
				'🔗 Отправьте ссылку заново\n\n' + 'Пример: https://example.com',
				{ reply_markup: { remove_keyboard: true } }
			)
		} else {
			await ctx.reply(
				'🤖 Используйте кнопки выше для подтверждения или редактирования ссылки.'
			)
		}
	}

	/**
	 * Обработка ожидания UTM метки
	 * @param {Object} ctx - Контекст Telegram
	 * @param {string} text - Текст сообщения
	 */
	async handleWaitingUtm(ctx, text) {
		if (!isValidUtmTag(text)) {
			await ctx.reply(
				'❌ UTM метка не должна содержать пробелы!\n\n' +
					'Используйте подчеркивания (_) или дефисы (-) вместо пробелов.\n' +
					'Пример: summer_sale, promo-2024'
			)
			return
		}

		ctx.session.utmTag = text

		try {
			// Создаем финальную ссылку с UTM метками
			ctx.session.finalUrl = this.qrCodeService.createUtmUrl(
				ctx.session.url,
				ctx.session.utmTag
			)
			ctx.session.step = sessionStates.WAITING_CONFIRMATION

			await ctx.reply(
				'✅ Итоговая ссылка с UTM метками:\n\n' +
					'📊 UTM параметры:\n' +
					`• utm_medium: qrcode\n` +
					`• utm_campaign: ${ctx.session.utmTag}\n\n` +
					'Подтвердите создание QR-кода:'
			)

			// Отправляем итоговую ссылку без превью
			await ctx.reply(ctx.session.finalUrl, {
				link_preview_options: { is_disabled: true },
				entities: [
					{
						type: 'url',
						offset: 0,
						length: ctx.session.finalUrl.length,
					},
				],
			})

			// Создаем клавиатуру для выбора формата и подтверждения
			const qrKeyboard = new Keyboard()
				.text('📱 PNG (прозрачный фон)')
				.text('🖼️ JPG (белый фон)')
				.row()
				.text('✏️ Отредактировать UTM')
				.resized()

			await ctx.reply('Выберите формат QR-кода:', {
				reply_markup: qrKeyboard,
			})
		} catch (error) {
			await ctx.reply('❌ Ошибка при создании UTM ссылки. Попробуйте еще раз.')
			ctx.session.step = null
		}
	}

	/**
	 * Обработка подтверждения создания QR-кода
	 * @param {Object} ctx - Контекст Telegram
	 * @param {string} text - Текст сообщения
	 */
	async handleConfirmation(ctx, text) {
		if (text === '📱 PNG (прозрачный фон)' || text === '🖼️ JPG (белый фон)') {
			// Определяем формат
			const format = text.includes('PNG') ? qrFormats.PNG : qrFormats.JPG
			ctx.session.format = format

			await ctx.reply(
				`⏳ Генерирую QR-код в формате ${format.toUpperCase()}...`,
				{
					reply_markup: { remove_keyboard: true },
				}
			)

			try {
				// Создаем QR-код
				const qrCodeInfo = await this.qrCodeService.createQRCodeWithUtm(
					ctx.session.url,
					ctx.session.utmTag,
					format,
					ctx.from.id
				)

				// Отправляем файл пользователю как документ
				await ctx.replyWithDocument(
					new InputFile(qrCodeInfo.filepath, qrCodeInfo.filename),
					{
						caption: `✅ QR-код готов!\n\n🔗 Ссылка: ${
							qrCodeInfo.finalUrl
						}\n🏷️ UTM метка: ${
							qrCodeInfo.utmTag
						}\n📁 Формат: ${format.toUpperCase()}`,
					}
				)

				// Удаляем временный файл
				await this.qrCodeService.cleanupQRCodeFile(qrCodeInfo.filepath)

				// Сбрасываем сессию
				this.resetSession(ctx)

				await ctx.reply(
					'🎉 QR-код успешно создан!\n\n' +
						'Используйте команду /qrcode для создания нового QR-кода.'
				)
			} catch (error) {
				this.errorHandler.handleApiError(error, 'QR code generation')
				await ctx.reply('❌ Ошибка при генерации QR-кода. Попробуйте еще раз.')
				ctx.session.step = null
			}
		} else if (text === '✏️ Отредактировать UTM') {
			ctx.session.step = sessionStates.WAITING_UTM

			await ctx.reply(
				'🏷️ Отправьте UTM метку заново\n\n' +
					'UTM метка должна быть без пробелов (используйте подчеркивания или дефисы)\n' +
					'Пример: summer_sale, promo2024, newsletter',
				{ reply_markup: { remove_keyboard: true } }
			)
		} else {
			await ctx.reply(
				'🤖 Используйте кнопки выше для выбора формата или редактирования UTM метки.'
			)
		}
	}

	/**
	 * Сброс сессии
	 * @param {Object} ctx - Контекст Telegram
	 */
	resetSession(ctx) {
		ctx.session.step = null
		ctx.session.url = null
		ctx.session.utmTag = null
		ctx.session.finalUrl = null
		ctx.session.format = qrFormats.PNG
	}
}

module.exports = QRCodeHandler
