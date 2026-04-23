const fs = require('fs')
const path = require('path')
const config = require('../config')

/**
 * @returns {Record<string, Record<string, { sold: number, invites: number, sum: number }>>}
 */
function readAll() {
	const filePath = config.snapshots.filePath
	try {
		if (!fs.existsSync(filePath)) {
			return {}
		}
		const raw = fs.readFileSync(filePath, 'utf8')
		const data = JSON.parse(raw)
		return data && typeof data === 'object' ? data : {}
	} catch {
		return {}
	}
}

/**
 * Снимок за календарный день (по Самаре): eventId -> метрики.
 * @param {string} samaraYyyyMmDd
 * @returns {Record<string, { sold: number, invites: number, sum: number }>}
 */
function getSnapshotForDate(samaraYyyyMmDd) {
	const all = readAll()
	const day = all[samaraYyyyMmDd]
	return day && typeof day === 'object' ? day : {}
}

/**
 * Объединить снимок за день (атомарная запись).
 * @param {string} samaraYyyyMmDd
 * @param {Record<string, { sold: number, invites: number, sum: number }>} partialMap
 */
function mergeSnapshotForDate(samaraYyyyMmDd, partialMap) {
	const filePath = config.snapshots.filePath
	const dir = path.dirname(filePath)
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true })
	}

	const all = readAll()
	const prevDay =
		all[samaraYyyyMmDd] && typeof all[samaraYyyyMmDd] === 'object'
			? { ...all[samaraYyyyMmDd] }
			: {}
	all[samaraYyyyMmDd] = { ...prevDay, ...partialMap }

	const tmpPath = `${filePath}.tmp`
	fs.writeFileSync(tmpPath, JSON.stringify(all, null, '\t'), 'utf8')
	fs.renameSync(tmpPath, filePath)
}

module.exports = {
	getSnapshotForDate,
	mergeSnapshotForDate,
}
