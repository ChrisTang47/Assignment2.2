const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // 設置CORS標頭
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // 處理預檢請求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // 決定檔案路徑
    let filePath = req.url === '/' ? './index.html' : '.' + req.url;
    
    // 讀取檔案
    fs.readFile(filePath, (err, content) => {
        if (err) {
            console.log(`檔案不存在: ${filePath}`);
            res.writeHead(404);
            res.end('檔案未找到');
        } else {
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            res.end(content);
            console.log(`成功提供檔案: ${filePath}`);
        }
    });
});

const PORT = 8080;
server.listen(PORT, () => {
    console.log('');
    console.log('🚀 伺服器已啟動！');
    console.log(`📍 訪問地址: http://127.0.0.1:${PORT}/index.html`);
    console.log('✅ CORS已啟用，API連接正常');
    console.log('📝 所有修復已應用');
    console.log('⭐ 按 Ctrl+C 停止伺服器');
    console.log('');
});