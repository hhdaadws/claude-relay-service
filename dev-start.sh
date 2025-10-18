#!/bin/bash
# Claude Relay Service - 开发环境启动脚本

set -e

echo "========================================="
echo "  Claude Relay Service - 开发环境启动"
echo "========================================="
echo ""

# 进入项目目录
cd "$(dirname "$0")"

# 检查配置文件
echo "📋 检查配置文件..."
if [ ! -f "config/config.js" ]; then
    echo "⚠️  配置文件不存在，正在复制..."
    cp config/config.example.js config/config.js
fi

if [ ! -f ".env" ]; then
    echo "⚠️  环境变量文件不存在，正在复制..."
    cp .env.example .env
fi

if [ ! -f "data/init.json" ]; then
    echo "⚠️  管理员凭据不存在，运行初始化..."
    npm run setup
fi

# 检查Redis
echo ""
echo "🔍 检查Redis状态..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️  Redis未运行，尝试启动..."

    # 尝试多种方式启动Redis
    if command -v systemctl > /dev/null 2>&1; then
        sudo systemctl start redis 2>/dev/null || sudo systemctl start redis-server 2>/dev/null || echo "❌ 无法启动Redis服务"
    else
        redis-server --daemonize yes 2>/dev/null || echo "❌ 无法启动Redis"
    fi

    # 等待Redis启动
    sleep 2

    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis已启动"
    else
        echo "❌ Redis启动失败，请手动启动Redis"
        exit 1
    fi
else
    echo "✅ Redis运行正常"
fi

# 检查依赖
echo ""
echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  依赖未安装，正在安装..."
    npm install
else
    echo "✅ 依赖已安装"
fi

# 显示管理员信息
echo ""
echo "========================================="
echo "📝 管理员凭据信息"
echo "========================================="
if [ -f "data/init.json" ]; then
    cat data/init.json
else
    echo "⚠️  管理员凭据文件不存在"
fi

echo ""
echo "========================================="
echo "🚀 启动开发服务器"
echo "========================================="
echo ""
echo "后端服务将运行在: http://localhost:3000"
echo "Web管理界面: http://localhost:3000/admin-next/"
echo "传统界面: http://localhost:3000/web"
echo "健康检查: http://localhost:3000/health"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 启动开发服务器（热重载）
npm run dev
