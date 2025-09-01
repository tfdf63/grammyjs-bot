/**
 * Валидация URL
 * @param {string} url - URL для проверки
 * @returns {boolean} - Результат валидации
 */
function isValidUrl(url) {
	try {
		const urlObj = new URL(url)
		return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
	} catch {
		return false
	}
}

/**
 * Валидация UTM метки
 * @param {string} utmTag - UTM метка для проверки
 * @returns {boolean} - Результат валидации
 */
function isValidUtmTag(utmTag) {
	if (!utmTag || utmTag.length === 0) {
		return false
	}

	// Проверяем на отсутствие пробелов и допустимые символы
	return /^[a-zA-Z0-9_-]+$/.test(utmTag)
}

/**
 * Валидация формата QR-кода
 * @param {string} format - Формат для проверки
 * @returns {boolean} - Результат валидации
 */
function isValidQrFormat(format) {
	return ['png', 'jpg'].includes(format.toLowerCase())
}

module.exports = {
	isValidUrl,
	isValidUtmTag,
	isValidQrFormat,
}
