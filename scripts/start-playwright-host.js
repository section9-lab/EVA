#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 检查 playwright-host 目录是否存在
const hostDir = path.join(__dirname, '../playwright-host');
if (!fs.existsSync(hostDir)) {
  console.error('❌ Playwright host directory not found:', hostDir);
  process.exit(1);
}

// 检查依赖是否已安装
const packageJsonPath = path.join(hostDir, 'package.json');
const nodeModulesPath = path.join(hostDir, 'node_modules');

if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found in playwright-host directory');
  process.exit(1);
}

if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies for Playwright host...');
  const npmInstall = spawn('npm', ['install'], {
    cwd: hostDir,
    stdio: 'inherit'
  });

  npmInstall.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Failed to install dependencies');
      process.exit(1);
    }
    console.log('✅ Dependencies installed successfully');
    startHost();
  });
} else {
  startHost();
}

function startHost() {
  console.log('🚀 Starting Playwright Host...');
  console.log('📍 Host directory:', hostDir);
  console.log('🔗 WebSocket URL: ws://localhost:8765');
  console.log('💡 Press Ctrl+C to stop the host');
  console.log('');

  const hostProcess = spawn('node', ['index.js'], {
    cwd: hostDir,
    stdio: 'inherit'
  });

  hostProcess.on('close', (code) => {
    console.log(`\n🛑 Playwright Host stopped (exit code: ${code})`);
  });

  hostProcess.on('error', (error) => {
    console.error('❌ Failed to start Playwright Host:', error.message);
    process.exit(1);
  });

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Playwright Host...');
    hostProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Playwright Host...');
    hostProcess.kill('SIGTERM');
  });
}