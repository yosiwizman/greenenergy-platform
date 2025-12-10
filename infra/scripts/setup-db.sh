#!/bin/bash

# Setup script for initializing the development database

echo "🚀 Starting PostgreSQL container..."
docker-compose -f ../docker/docker-compose.yml up -d

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

echo "📦 Generating Prisma client..."
cd ../../packages/db
pnpm db:generate

echo "🔄 Running database migrations..."
pnpm db:migrate

echo "✅ Database setup complete!"
echo "Connection string: postgresql://postgres:postgres@localhost:5432/greenenergy?schema=public"
