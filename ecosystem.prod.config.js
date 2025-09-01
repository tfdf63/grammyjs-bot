module.exports = {
	apps: [
		{
			name: 'tg-grammy-tickets-bot',
			script: 'src/index.js',
			cron_restart: '0 9 * * *',
			cwd: '/root/tgGrammyTickets', // Путь для сервера
			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: '1G',
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
