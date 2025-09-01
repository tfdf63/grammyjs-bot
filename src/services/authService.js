const crypto = require('crypto')
const { getTimestamp } = require('../utils/timeUtils')
const config = require('../config')

class AuthService {
	constructor() {
		this.login = config.api.login
		this.password = config.api.password
	}

	/**
	 * Генерация строки аутентификации
	 * @returns {string} - Строка аутентификации
	 */
	generateAuthString() {
		const timestamp = getTimestamp()

		// Хешируем пароль сначала с помощью MD5, затем с помощью SHA1
		const hashedPassword = crypto
			.createHash('sha1')
			.update(
				crypto.createHash('md5').update(this.password).digest('hex') + timestamp
			)
			.digest('hex')

		return `${this.login}:${hashedPassword}:${timestamp}`
	}

	/**
	 * Получение актуальной строки аутентификации
	 * @returns {string} - Актуальная строка аутентификации
	 */
	getAuthString() {
		return this.generateAuthString()
	}
}

module.exports = AuthService
