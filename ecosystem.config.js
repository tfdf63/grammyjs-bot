module.exports = {
	apps: [
		{
			name: 'tg-grammy-tickets-bot',
			script: 'src/index.js',
			cwd: process.cwd(), // Используем текущую директорию
			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: '1G',
			// Добавляем настройки для предотвращения дублирования
			unique: true, // Гарантирует уникальность процесса
			kill_timeout: 5000, // Время ожидания перед принудительной остановкой
			wait_ready: true, // Ждет сигнал ready от приложения
			listen_timeout: 10000, // Таймаут ожидания готовности
			env: {
				NODE_ENV: 'production',
				PORT: 3000,
			},
			env_file: '.env',
			log_file: './logs/pm2.log',
			out_file: './logs/pm2-out.log',
			error_file: './logs/pm2-error.log',
			log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
			merge_logs: true,
			time: true,
		},
	],
}
