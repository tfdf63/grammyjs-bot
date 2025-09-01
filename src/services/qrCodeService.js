const QRCode = require('qrcode')
const path = require('path')
const fs = require('fs')
const config = require('../config')

class QRCodeService {
	constructor() {
		this.defaultFormat = config.qrCode.defaultFormat
		this.defaultSize = config.qrCode.defaultSize
		this.quality = config.qrCode.quality
		this.margin = config.qrCode.margin
	}

	/**
	 * Создание UTM ссылки
	 * @param {string} baseUrl - Базовая ссылка
	 * @param {string} utmTag - UTM метка
	 * @returns {string} - Ссылка с UTM параметрами
	 */
	createUtmUrl(baseUrl, utmTag) {
		try {
			const url = new URL(baseUrl)

			// Добавляем UTM параметры
			url.searchParams.set('utm_medium', 'qrcode')
			url.searchParams.set('utm_campaign', utmTag)

			return url.toString()
		} catch (error) {
			throw new Error('Ошибка при создании UTM ссылки')
		}
	}

	/**
	 * Генерация QR-кода
	 * @param {string} text - Текст для кодирования
	 * @param {string} filename - Имя файла
	 * @param {string} format - Формат файла
	 * @returns {Promise<string>} - Путь к созданному файлу
	 */
	async generateQRCode(text, filename, format = this.defaultFormat) {
		try {
			const options = {
				type: format,
				quality: this.quality,
				margin: this.margin,
				color: {
					dark: '#000000',
					light: format === 'png' ? '#0000' : '#FFFFFF', // Прозрачный фон для PNG, белый для JPG
				},
				width: this.defaultSize,
			}

			await QRCode.toFile(filename, text, options)
			return filename
		} catch (error) {
			throw new Error('Ошибка при генерации QR-кода')
		}
	}

	/**
	 * Создание QR-кода с UTM меткой
	 * @param {string} baseUrl - Базовая ссылка
	 * @param {string} utmTag - UTM метка
	 * @param {string} format - Формат файла
	 * @param {number} userId - ID пользователя
	 * @returns {Promise<Object>} - Информация о созданном QR-коде
	 */
	async createQRCodeWithUtm(baseUrl, utmTag, format, userId) {
		const finalUrl = this.createUtmUrl(baseUrl, utmTag)
		const filename = `qrcode_${userId}_${Date.now()}.${format}`
		const filepath = path.join(process.cwd(), filename)

		await this.generateQRCode(finalUrl, filepath, format)

		return {
			filepath,
			filename,
			finalUrl,
			utmTag,
			format,
		}
	}

	/**
	 * Удаление временного файла QR-кода
	 * @param {string} filepath - Путь к файлу
	 * @returns {Promise<void>}
	 */
	async cleanupQRCodeFile(filepath) {
		try {
			await fs.promises.unlink(filepath)
		} catch (error) {
			console.error('Ошибка при удалении временного файла QR-кода:', error)
		}
	}
}

module.exports = QRCodeService
