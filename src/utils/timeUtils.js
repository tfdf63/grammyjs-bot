const config = require('../config')

/**
 * Получение текущего времени в Самаре
 * @returns {Date} - Текущее время в Самаре
 */
function getSamaraTime() {
	const now = new Date()
	const samaraOffset = config.timezone.offset * 60 * 60 * 1000
	return new Date(now.getTime() + samaraOffset)
}

/**
 * Проверка, нужно ли отправить отчет
 * @returns {boolean} - Нужно ли отправить отчет
 */
function shouldSendReport() {
	const samaraTime = getSamaraTime()
	const hours = samaraTime.getUTCHours()
	const minutes = samaraTime.getUTCMinutes()

	return hours === config.scheduler.reportHour && minutes === 0
}

/**
 * Получение временной метки для аутентификации
 * @returns {number} - Текущая метка времени в секундах
 */
function getTimestamp() {
	return Math.floor(Date.now() / 1000)
}

module.exports = {
	getSamaraTime,
	shouldSendReport,
	getTimestamp,
}
