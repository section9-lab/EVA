import { browser } from "wxt/browser";

/** 
 * 新建 chrome tab 页函数
 */
export function openTab(url: string) {
    browser.tabs.create({ url });
}

/**
 * 切换 chrome tab 页函数
 */
export function switchTab(tabId: number) {
    browser.tabs.update(tabId, { active: true });
}

/**
 * 获取所有 chrome tab 页函数
 */
export async function getAllTabs() {
    return await browser.tabs.query({});
}

/**
 * 关闭 chrome tab 页函数
 */
export default function closeTab(tabId: number) {
    browser.tabs.remove(tabId);
}