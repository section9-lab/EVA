export enum MessageType {
    clickExtIcon = "clickExtIcon",
    changeTheme = "changeTheme",
    changeLocale = "changeLocale",
    saveModelConfig = "saveModelConfig",
    getHistory = "getHistory",
    historyResult = "historyResult",
    analyzePage = "analyzePage",
    executeTask = "executeTask",
    taskResult = "taskResult",
    highlightElement = "highlightElement",
    removeHighlight = "removeHighlight",
    playwrightAction = "playwrightAction",
    playwrightResult = "playwrightResult",
    connectPlaywright = "connectPlaywright",
    playwrightStatus = "playwrightStatus"
}

export enum MessageFrom {
    contentScript = "contentScript",
    background = "background",
    popUp = "popUp",
    sidePanel = "sidePanel",
}

export interface ElementSelector {
    type: 'css' | 'xpath' | 'text' | 'aria-label';
    value: string;
}

export interface TaskStep {
    id: string;
    action: 'click' | 'type' | 'scroll' | 'wait' | 'extract' | 'screenshot' | 'navigate' | 'hover' | 'drag' | 'select';
    target?: ElementSelector;
    value?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: any;
    playwrightAction?: string;
    playwrightParams?: any;
}

export interface Task {
    id: string;
    description: string;
    steps: TaskStep[];
    status: 'pending' | 'running' | 'completed' | 'failed';
    createdAt: number;
    completedAt?: number;
}

export interface PageAnalysis {
    interactiveElements: Array<{
        selector: string;
        text: string;
        type: string;
    }>;
}

export interface PlaywrightAction {
    id: string;
    action: string;
    params?: any;
    timeout?: number;
}

export interface PlaywrightResult {
    id: string;
    action: string;
    success: boolean;
    result?: any;
    error?: string;
}

export class ExtMessage {
    content?: string;
    from?: MessageFrom;
    task?: Task;
    pageAnalysis?: PageAnalysis;
    stepResult?: any;
    playwrightAction?: PlaywrightAction;
    playwrightResult?: PlaywrightResult;

    constructor(messageType: MessageType) {
        this.messageType = messageType;
    }

    messageType: MessageType;
}

export default ExtMessage;
