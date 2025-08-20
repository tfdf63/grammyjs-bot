#!/bin/bash

# Скрипт для развертывания Telegram бота на сервере
# Использование: ./deploy.sh [prod|dev]

set -e

# Определяем окружение
ENV=${1:-dev}
COMPOSE_FILE="docker-compose.yml"

if [ "$ENV" = "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "🚀 Развертывание в PRODUCTION режиме"
else
    echo "🔧 Развертывание в DEVELOPMENT режиме"
fi

echo "📦 Сборка Docker образа..."
docker-compose -f $COMPOSE_FILE build

echo "🔄 Остановка существующих контейнеров..."
docker-compose -f $COMPOSE_FILE down

echo "🚀 Запуск новых контейнеров..."
docker-compose -f $COMPOSE_FILE up -d

echo "✅ Развертывание завершено!"
echo "📊 Статус контейнеров:"
docker-compose -f $COMPOSE_FILE ps

echo "📝 Логи контейнера:"
docker-compose -f $COMPOSE_FILE logs -f --tail=20
