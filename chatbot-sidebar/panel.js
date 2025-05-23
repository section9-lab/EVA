// panel.js
document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chat-input');
  const chatHistory = document.getElementById('chat-history');
  const sendBtn = document.getElementById('send-btn');
  const typingIndicator = document.querySelector('.typing-indicator');

  // 初始化聊天记录
  loadChatHistory();

  // 消息处理核心
  function handleMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    chatInput.value = '';
    showTypingIndicator();
    processMessage(message);
  }

  // 添加消息
  function addMessage(content, sender) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}-message`;
    
    const timestamp = new Date().toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit'
    });

    messageElement.innerHTML = `
      <div class="content">${content}</div>
      <div class="timestamp">${timestamp}</div>
    `;

    chatHistory.appendChild(messageElement);
    saveChatHistory();
    scrollToBottom();
  }

  // 处理消息逻辑
  async function processMessage(message) {
    try {
      const response = await generateResponse(message);
      setTimeout(() => {
        addMessage(response, 'bot');
        hideTypingIndicator();
      }, 1200);
    } catch (error) {
      addMessage('抱歉，暂时无法处理您的请求', 'bot');
      hideTypingIndicator();
    }
  }

  // 智能回复生成
  async function generateResponse(message) {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const lowerMsg = message.toLowerCase();
    
    // 增强的回复逻辑
    const responses = {
      greetings: ['你好', '您好', '嗨'],
      help: ['帮助', '功能', '你能做什么'],
      math: {
        pattern: /(\d+)([+-\*/])(\d+)/,
        handler: (match) => {
          const [a, op, b] = match.slice(1);
          const operations = {
            '+': (x,y) => x + y,
            '-': (x,y) => x - y,
            '*': (x,y) => x * y,
            '/': (x,y) => x / y
          };
          return `计算结果：${a} ${op} ${b} = ${operations[op](+a, +b)}`;
        }
      },
      time: () => `当前时间：${new Date().toLocaleTimeString('zh-CN')}`,
      weather: async () => {
        try {
          // 实际开发中替换为真实API
          const weather = await fakeWeatherAPI();
          return `当前天气：${weather}`;
        } catch {
          return '暂时无法获取天气信息';
        }
      }
    };

    // 匹配逻辑
    if (responses.greetings.some(g => lowerMsg.includes(g))) {
      return randomChoice(['您好！有什么可以帮您？', '很高兴为您服务！', '请问需要什么帮助？']);
    }
    
    if (responses.help.some(h => lowerMsg.includes(h))) {
      return `支持功能：
        • 数学运算（示例：3+5）
        • 时间查询
        • 天气查询
        • 日常对话`;
    }
    
    if (responses.math.pattern.test(message)) {
      return responses.math.handler(message.match(responses.math.pattern));
    }
    
    if (lowerMsg.includes('时间')) {
      return responses.time();
    }
    
    if (lowerMsg.includes('天气')) {
      return await responses.weather();
    }
    
    return randomChoice([
      '这是一个有趣的话题，能详细说说吗？',
      '我还在不断学习中，您可以换种方式提问吗？',
      '已记录您的问题，稍后将为您解答'
    ]);
  }

  // 工具函数
  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  async function fakeWeatherAPI() {
    await new Promise(resolve => setTimeout(resolve, 500));
    const conditions = ['晴', '多云', '小雨', '阴'];
    const temp = Math.floor(Math.random() * 15 + 15);
    return `${randomChoice(conditions)}，${temp}℃`;
  }

  // 用户体验增强
  function showTypingIndicator() {
    typingIndicator.style.display = 'flex';
    scrollToBottom();
  }

  function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
  }

  function scrollToBottom() {
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  // 本地存储
  function saveChatHistory() {
    const history = chatHistory.innerHTML;
    localStorage.setItem('chatHistory', history);
  }

  function loadChatHistory() {
    const history = localStorage.getItem('chatHistory');
    if (history) {
      chatHistory.innerHTML = history;
      scrollToBottom();
    }
  }

  // 事件监听
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMessage();
    }
  });

  sendBtn.addEventListener('click', handleMessage);

  // 快捷操作
  document.querySelectorAll('.quick-actions li').forEach(li => {
    li.addEventListener('click', () => {
      chatInput.value = li.textContent;
      handleMessage();
    });
  });

  // 初始化问候
  if (!localStorage.getItem('chatHistory')) {
    setTimeout(() => {
      addMessage('您好！我是您的智能助手，随时为您效劳。', 'bot');
    }, 800);
  }
});