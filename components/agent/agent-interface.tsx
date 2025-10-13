import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { EVAAgent } from "@/entrypoints/agent/core/eva-agent";
import { AgentState, AgentCapability } from "@/entrypoints/agent/core/agent-types";

interface AgentMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
  metadata?: any;
}

interface AgentStatus {
  state: AgentState;
  currentGoal?: string;
  currentPlan?: any;
  capabilities: AgentCapability[];
  context?: any;
}

export function AgentInterface() {
  const { t } = useTranslation();
  const [agent] = useState(() => new EVAAgent());
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [showStatus, setShowStatus] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 初始化代理事件监听
    setupAgentListeners();

    // 添加欢迎消息
    setMessages([{
      id: 'welcome',
      type: 'agent',
      content: t('agent.welcomeMessage'),
      timestamp: Date.now()
    }]);

    // 获取初始状态
    updateAgentStatus();

    return () => {
      // 清理监听器
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupAgentListeners = () => {
    // 监听状态变化
    agent.onStateChange((state) => {
      setAgentStatus(prev => prev ? { ...prev, state } : { state, capabilities: [] });

      // 添加状态变化消息
      if (state === AgentState.EXECUTING) {
        addSystemMessage(t('agent.states.executing'));
      } else if (state === AgentState.ERROR) {
        addSystemMessage(t('agent.states.error'));
      }
    });

    // 监听感知事件
    agent.onPerception((perception) => {
      addSystemMessage(t('agent.perceiving', { type: perception.type }));
    });

    // 监听动作事件
    agent.onAction((action) => {
      addSystemMessage(t('agent.executingAction', { action: action.type }));
    });
  };

  const updateAgentStatus = () => {
    const status: AgentStatus = {
      state: agent.getState(),
      currentGoal: agent.getCurrentGoal()?.description,
      currentPlan: agent.getCurrentPlan(),
      capabilities: Array.from((agent as any).capabilities || []),
      context: agent.getContext()
    };
    setAgentStatus(status);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addSystemMessage = (content: string, metadata?: any) => {
    const message: AgentMessage = {
      id: `system_${Date.now()}`,
      type: 'system',
      content,
      timestamp: Date.now(),
      metadata
    };
    setMessages(prev => [...prev, message]);
  };

  const handleUserInput = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: AgentMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const result = await agent.processUserInput(inputValue);

      const agentMessage: AgentMessage = {
        id: `agent_${Date.now()}`,
        type: 'agent',
        content: result.success ?
          result.response || t('agent.taskCompleted') :
          result.error || t('agent.taskFailed'),
        timestamp: Date.now(),
        metadata: result
      };

      setMessages(prev => [...prev, agentMessage]);
      updateAgentStatus();

    } catch (error) {
      const errorMessage: AgentMessage = {
        id: `error_${Date.now()}`,
        type: 'agent',
        content: t('agent.processingError', { error: error.message }),
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStateColor = (state: AgentState) => {
    switch (state) {
      case AgentState.IDLE: return 'bg-gray-500';
      case AgentState.PERCEIVING: return 'bg-blue-500';
      case AgentState.PLANNING: return 'bg-yellow-500';
      case AgentState.EXECUTING: return 'bg-green-500';
      case AgentState.REFLECTING: return 'bg-purple-500';
      case AgentState.ERROR: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStateText = (state: AgentState) => {
    switch (state) {
      case AgentState.IDLE: return t('agent.states.idle');
      case AgentState.PERCEIVING: return t('agent.states.perceiving');
      case AgentState.PLANNING: return t('agent.states.planning');
      case AgentState.EXECUTING: return t('agent.states.executing');
      case AgentState.REFLECTING: return t('agent.states.reflecting');
      case AgentState.ERROR: return t('agent.states.error');
      default: return state;
    }
  };

  const getCapabilityText = (capability: AgentCapability) => {
    switch (capability) {
      case AgentCapability.VISUAL_PERCEPTION: return t('agent.capabilities.visualPerception');
      case AgentCapability.TEXT_UNDERSTANDING: return t('agent.capabilities.textUnderstanding');
      case AgentCapability.ACTION_PLANNING: return t('agent.capabilities.actionPlanning');
      case AgentCapability.TOOL_EXECUTION: return t('agent.capabilities.toolExecution');
      case AgentCapability.CONTEXT_AWARENESS: return t('agent.capabilities.contextAwareness');
      case AgentCapability.ADAPTIVE_LEARNING: return t('agent.capabilities.adaptiveLearning');
      case AgentCapability.CONVERSATION: return t('agent.capabilities.conversation');
      case AgentCapability.TASK_COORDINATION: return t('agent.capabilities.taskCoordination');
      default: return capability;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserInput();
    }
  };

  const clearConversation = () => {
    setMessages([{
      id: 'welcome',
      type: 'agent',
      content: t('agent.welcomeMessage'),
      timestamp: Date.now()
    }]);
  };

  const getMemory = () => {
    const memory = agent.getMemory();
    return memory;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Agent 状态栏 */}
      <div className="border-b p-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStateColor(agentStatus?.state || AgentState.IDLE)}`}></div>
            <span className="text-sm font-medium">
              {agentStatus ? getStateText(agentStatus.state) : t('agent.states.initializing')}
            </span>
            {agentStatus?.currentGoal && (
              <Badge variant="outline" className="text-xs">
                {agentStatus.currentGoal}
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStatus(!showStatus)}
            >
              {t('agent.status')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMemory(!showMemory)}
            >
              {t('agent.memory')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearConversation}
            >
              {t('agent.clear')}
            </Button>
          </div>
        </div>

        {/* 能力展示 */}
        {agentStatus && agentStatus.capabilities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {agentStatus.capabilities.map(capability => (
              <Badge key={capability} variant="secondary" className="text-xs">
                {getCapabilityText(capability)}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* 状态详情面板 */}
      {showStatus && agentStatus && (
        <Card className="m-3 p-4">
          <h4 className="font-medium mb-2">{t('agent.currentStatus')}</h4>
          <div className="space-y-2 text-sm">
            <div><strong>{t('agent.state')}:</strong> {getStateText(agentStatus.state)}</div>
            {agentStatus.currentGoal && (
              <div><strong>{t('agent.goal')}:</strong> {agentStatus.currentGoal}</div>
            )}
            {agentStatus.context && (
              <div><strong>{t('agent.context')}:</strong> {agentStatus.context.currentUrl}</div>
            )}
            {agentStatus.currentPlan && (
              <div>
                <strong>{t('agent.plan')}:</strong>
                <div className="ml-4 mt-1">
                  {agentStatus.currentPlan.steps.map((step: any, index: number) => (
                    <div key={step.id} className="text-xs text-gray-600">
                      {index + 1}. {step.description || step.type}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 记忆详情面板 */}
      {showMemory && (
        <Card className="m-3 p-4">
          <h4 className="font-medium mb-2">{t('agent.memoryDetails')}</h4>
          <div className="space-y-2 text-sm">
            <div><strong>{t('agent.recentActions')}:</strong> {getMemory().shortTerm.recentActions.length}</div>
            <div><strong>{t('agent.conversationHistory')}:</strong> {getMemory().shortTerm.conversationHistory.length}</div>
            <div><strong>{t('agent.learnedPatterns')}:</strong> {getMemory().longTerm.learnedPatterns.length}</div>
            <div><strong>{t('agent.userPreferences')}:</strong> {Object.keys(getMemory().longTerm.userPreferences).length}</div>
          </div>
        </Card>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === 'user' ? 'justify-end' :
              message.type === 'system' ? 'justify-center' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.type === 'system'
                  ? 'bg-gray-200 text-gray-600 text-sm'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span className="text-sm text-gray-600 ml-2">{t('agent.processing')}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t p-4">
        <div className="flex items-center space-x-2">
          <textarea
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={t('agent.inputPlaceholder')}
            rows={3}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
          />
          <Button
            onClick={handleUserInput}
            disabled={isProcessing || !inputValue.trim()}
            className="px-4 py-2"
          >
            {isProcessing ? t('agent.processing') : t('agent.send')}
          </Button>
        </div>
      </div>
    </div>
  );
}