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

/**
 * Календарная дата по Самаре из «самарского» Date (UTC-поля = стенные часы Самары).
 * @param {Date} samaraWall
 * @returns {string} YYYY-MM-DD
 */
function samaraWallDateToIsoString(samaraWall) {
	const y = samaraWall.getUTCFullYear()
	const mo = samaraWall.getUTCMonth() + 1
	const d = samaraWall.getUTCDate()
	return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Сегодняшняя календарная дата по Самаре (YYYY-MM-DD).
 * @returns {string}
 */
function getSamaraCalendarTodayString() {
	return samaraWallDateToIsoString(getSamaraTime())
}

/**
 * Вчерашняя календарная дата по Самаре (YYYY-MM-DD).
 * @returns {string}
 */
function getSamaraCalendarYesterdayString() {
	const t = getSamaraTime()
	const y = t.getUTCFullYear()
	const mo = t.getUTCMonth()
	const d = t.getUTCDate()
	const prev = new Date(Date.UTC(y, mo, d - 1))
	return samaraWallDateToIsoString(prev)
}

/**
 * Календарная дата «вчера» относительно сегодняшнего дня по Самаре (YYYY-MM-DD).
 * Матчи с matchDate >= этого значения попадают в /tickets и отчёт в канал.
 * @returns {string}
 */
function getMinMatchDateForTickets() {
	return getSamaraCalendarYesterdayString()
}

module.exports = {
	getSamaraTime,
	getSamaraCalendarTodayString,
	getSamaraCalendarYesterdayString,
	getMinMatchDateForTickets,
	shouldSendReport,
	getTimestamp,
}
