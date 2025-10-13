import {browser} from "wxt/browser";
import { defineBackground } from 'wxt/sandbox';
import ExtMessage, {MessageFrom, MessageType} from "@/entrypoints/types.ts";
import { AIIntentService } from "@/entrypoints/services/ai-intent-service";
import { TaskExecutionService } from "@/entrypoints/services/task-execution-service";

export default defineBackground(() => {
    // 初始化服务
    const aiIntentService = AIIntentService.getInstance();
    const taskExecutionService = TaskExecutionService.getInstance();
    console.log('Hello background!', {id: browser.runtime.id});// background.js

    // @ts-ignore
    browser.sidePanel.setPanelBehavior({openPanelOnActionClick: true}).catch((error: any) => console.error(error));

    //monitor the event from extension icon click
    browser.action.onClicked.addListener(async (tab) => {
        // 发送消息给content-script.js
        console.log("click icon")
        console.log(tab)
        if (tab.id) {
            browser.tabs.sendMessage(tab.id!, {messageType: MessageType.clickExtIcon});
        }
    });

    // background.js
    browser.runtime.onMessage.addListener(async (message: ExtMessage, sender, sendResponse) => {
        console.log("background:", message)

        if (message.messageType === MessageType.clickExtIcon) {
            console.log(message)
        } else if (message.messageType === MessageType.changeTheme || message.messageType === MessageType.changeLocale) {
            let tabs = await browser.tabs.query({active: true, currentWindow: true});
            console.log(`tabs:${tabs.length}`)
            if (tabs) {
                for (const tab of tabs) {
                    if (tab.id) {
                        await browser.tabs.sendMessage(tab.id!, message);
                    }
                }
            }
        } else if (message.messageType === MessageType.getHistory) {
            let content;
            try {
                const historyItems = await browser.history.search({text: '', maxResults: 100});
                if (historyItems.length > 0) {
                    const formattedHistory = historyItems.map(item => `- ${item.title || 'No Title'}\n  ${item.url}`).join('\n\n');
                    content = `Here is your recent history:\n\n${formattedHistory}`;
                } else {
                    content = "No browser history found.";
                }
            } catch (error) {
                content = `An error occurred while fetching history: ${error instanceof Error ? error.message : String(error)}`;
            }
            // Send the result back to the sender (the side panel)
            if (sender.tab?.id) {
                await browser.tabs.sendMessage(sender.tab.id, {
                    messageType: MessageType.historyResult,
                    content: content
                });
            }
        } else if (message.messageType === MessageType.executeTask) {
            // 执行任务
            if (message.task) {
                const result = await taskExecutionService.executeTask(message.task);

                // 通知侧边栏执行结果
                const tabs = await browser.tabs.query({active: true, currentWindow: true});
                if (tabs[0] && tabs[0].id) {
                    await browser.tabs.sendMessage(tabs[0].id, {
                        messageType: MessageType.taskResult,
                        taskResult: result
                    });
                }
            }
        } else if (message.messageType === MessageType.analyzePage) {
            // 分析页面
            const pageAnalysis = await taskExecutionService.analyzeCurrentPage();

            // 发送分析结果给侧边栏
            const tabs = await browser.tabs.query({active: true, currentWindow: true});
            if (tabs[0] && tabs[0].id) {
                await browser.tabs.sendMessage(tabs[0].id, {
                    messageType: MessageType.taskResult,
                    pageAnalysis: pageAnalysis
                });
            }
        } else if (message.messageType === MessageType.highlightElement) {
            // 高亮元素
            if (message.content) {
                try {
                    const selector = JSON.parse(message.content);
                    await taskExecutionService.highlightElement(selector);
                } catch (error) {
                    console.error("Error parsing selector:", error);
                }
            }
        } else if (message.messageType === MessageType.removeHighlight) {
            // 移除高亮
            await taskExecutionService.removeHighlight();
        }

        return true; // Keep message channel open for async operations
    });

    // 处理来自侧边栏的AI请求
    browser.runtime.onMessage.addListener(async (message, sender) => {
        if (message.type === 'AI_REQUEST') {
            try {
                // 首先分析当前页面
                const pageAnalysis = await taskExecutionService.analyzeCurrentPage();

                // 然后使用AI分析意图
                const task = await aiIntentService.analyzeIntent(message.userMessage, pageAnalysis);

                if (task) {
                    // 验证任务
                    const validation = await aiIntentService.validateTask(task);

                    if (validation.isValid) {
                        // 执行任务
                        const result = await taskExecutionService.executeTask(task);

                        // 通知结果
                        if (sender.tab?.id) {
                            await browser.tabs.sendMessage(sender.tab.id, {
                                type: 'AI_RESPONSE',
                                success: true,
                                task: task,
                                result: result,
                                message: `成功执行任务: ${task.description}`
                            });
                        }
                    } else {
                        // 任务验证失败
                        if (sender.tab?.id) {
                            await browser.tabs.sendMessage(sender.tab.id, {
                                type: 'AI_RESPONSE',
                                success: false,
                                errors: validation.errors,
                                message: "任务验证失败: " + validation.errors.join(", ")
                            });
                        }
                    }
                } else {
                    // 无法识别意图，使用普通聊天
                    if (sender.tab?.id) {
                        await browser.tabs.sendMessage(sender.tab.id, {
                            type: 'AI_RESPONSE',
                            success: true,
                            isChat: true,
                            message: "我无法识别您的操作意图，让我为您回答这个问题..."
                        });
                    }
                }
            } catch (error) {
                console.error("Error processing AI request:", error);
                if (sender.tab?.id) {
                    await browser.tabs.sendMessage(sender.tab.id, {
                        type: 'AI_RESPONSE',
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                        message: "处理请求时发生错误"
                    });
                }
            }
        }
    });

    // 监听标签页更新，清理活动任务
    browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete') {
            // 标签页加载完成，清理之前的任务
            const activeTasks = taskExecutionService.getActiveTasks();
            for (const task of activeTasks) {
                await taskExecutionService.stopTask(task.id);
            }
        }
    });

    // 监听标签页关闭，清理相关任务
    browser.tabs.onRemoved.addListener(async (tabId) => {
        const activeTasks = taskExecutionService.getActiveTasks();
        for (const task of activeTasks) {
            await taskExecutionService.stopTask(task.id);
        }
    });
});
