const axios = require('axios');
const fs = require('fs');

async function testSensitiveWordsAPI() {
  try {
    // 读取管理员凭据
    const initData = JSON.parse(fs.readFileSync('data/init.json', 'utf8'));
    const username = initData.adminUsername;
    const password = initData.adminPassword;

    console.log('Testing API with username:', username);

    // 登录获取token
    const loginRes = await axios.post('http://localhost:8080/web/auth/login', {
      username,
      password
    });

    const token = loginRes.data.token;
    console.log('Login successful, token:', token.substring(0, 20) + '...');

    // 获取敏感词列表
    const wordsRes = await axios.get('http://localhost:8080/admin/content-security/sensitive-words', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\n=== Sensitive Words Response ===');
    console.log('Success:', wordsRes.data.success);
    console.log('Total:', wordsRes.data.total);
    console.log('Data length:', wordsRes.data.data ? wordsRes.data.data.length : 0);
    console.log('First word:', wordsRes.data.data ? wordsRes.data.data[0] : null);

    // 获取统计信息
    const statsRes = await axios.get('http://localhost:8080/admin/content-security/sensitive-words-stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\n=== Stats Response ===');
    console.log('Success:', statsRes.data.success);
    console.log('Data:', statsRes.data.data);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testSensitiveWordsAPI();
