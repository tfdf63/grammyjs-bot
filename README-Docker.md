# Развертывание Telegram бота в Docker

## Требования

- Docker Engine 20.10+
- Docker Compose 2.0+
- 512MB RAM
- 1GB свободного места на диске

## Структура файлов

```
tgGrammyTickets/
├── Dockerfile                 # Образ Docker
├── docker-compose.yml         # Конфигурация для разработки
├── docker-compose.prod.yml    # Конфигурация для продакшена
├── .dockerignore             # Исключения для Docker
├── deploy.sh                 # Скрипт развертывания
├── .env                      # Переменные окружения
├── matches.js                # Конфигурация матчей
└── index.js                  # Основной код бота
```

## Быстрый старт

### 1. Подготовка переменных окружения

Создайте файл `.env` с необходимыми переменными:

```bash
# Telegram Bot API ключ
BOT_API_KEY=your_bot_token_here

# Данные для API билетов
BOT_TICKETS_LOGIN=your_login
BOT_TICKETS_PASSWORD=your_password
```

### 2. Развертывание

```bash
# Даем права на выполнение скрипта
chmod +x deploy.sh

# Развертывание в development режиме
./deploy.sh

# Развертывание в production режиме
./deploy.sh prod
```

### 3. Ручное управление

```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Просмотр логов
docker-compose logs -f

# Перезапуск
docker-compose restart
```

## Конфигурация

### Development (docker-compose.yml)

- Базовые настройки
- Автоматический перезапуск
- Простой healthcheck

### Production (docker-compose.prod.yml)

- Ограничения ресурсов
- Улучшенный healthcheck
- Ротация логов
- Оптимизированные настройки

## Мониторинг

### Проверка состояния

```bash
docker-compose ps
docker-compose logs telegram-bot
```

### Healthcheck

Контейнер автоматически проверяет свое состояние каждые 30-60 секунд.

## Обновление

### Обновление кода

```bash
# Остановка
docker-compose down

# Пересборка и запуск
./deploy.sh
```

### Обновление конфигурации матчей

Файл `matches.js` монтируется как volume, поэтому изменения применяются без перезапуска контейнера.

## Логи

Логи сохраняются в директории `./logs/` на хосте и доступны через:

```bash
docker-compose logs -f telegram-bot
```

## Безопасность

- Контейнер запускается от непривилегированного пользователя
- Переменные окружения загружаются из файла `.env`
- Сетевые порты не экспортируются наружу

## Troubleshooting

### Проблемы с правами доступа

```bash
sudo chown -R $USER:$USER ./logs
```

### Очистка Docker

```bash
docker system prune -f
docker volume prune -f
```

### Проверка переменных окружения

```bash
docker-compose exec telegram-bot env | grep BOT
```
