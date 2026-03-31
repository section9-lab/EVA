import { browser } from 'wxt/browser';

export interface BrowserActionResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

export class ContentScriptBrowserService {
  private static instance: ContentScriptBrowserService;

  static getInstance(): ContentScriptBrowserService {
    if (!ContentScriptBrowserService.instance) {
      ContentScriptBrowserService.instance = new ContentScriptBrowserService();
    }
    return ContentScriptBrowserService.instance;
  }

  async getActiveTabId(): Promise<number> {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) {
      throw new Error('No active tab found');
    }
    return tabs[0].id;
  }

  async ensureContentScript(tabId: number): Promise<void> {
    try {
      await browser.tabs.sendMessage(tabId, { action: 'ping' });
    } catch {
      await browser.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      });
      await this.sleep(500);
    }
  }

  async executeInPage<T>(tabId: number, fn: () => T, args?: unknown[]): Promise<T> {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: fn,
      args: args || [],
    });
    return results[0].result as T;
  }

  async navigate(url: string): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await browser.tabs.update(tabId, { url });
      return { success: true, result: { url } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async click(selector: string): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await this.ensureContentScript(tabId);

      const result = await this.executeInPage(tabId, (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return { success: false, error: `Element not found: ${sel}` };

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const events = [
          new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }),
          new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }),
          new MouseEvent('click', { bubbles: true, cancelable: true, view: window }),
        ];
        events.forEach((e) => el.dispatchEvent(e));

        return { success: true, tag: el.tagName, text: el.textContent?.slice(0, 50) };
      }, [selector]);

      return result as BrowserActionResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async clickByText(text: string): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await this.ensureContentScript(tabId);

      const result = await this.executeInPage(tabId, (txt: string) => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) =>
            node.textContent?.trim().includes(txt)
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT,
        });

        const textNode = walker.nextNode();
        const el = textNode?.parentElement;
        if (!el) return { success: false, error: `Text not found: ${txt}` };

        const clickable = el.closest('button, a, [role="button"], [onclick], input[type="submit"], input[type="button"]') || el;
        clickable.scrollIntoView({ behavior: 'smooth', block: 'center' });
        clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

        return { success: true, tag: clickable.tagName, text: clickable.textContent?.slice(0, 50) };
      }, [text]);

      return result as BrowserActionResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async fill(selector: string, value: string): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await this.ensureContentScript(tabId);

      const result = await this.executeInPage(tabId, (sel: string, val: string) => {
        const el = document.querySelector(sel);
        if (!el) return { success: false, error: `Element not found: ${sel}` };
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
          return { success: false, error: `Not an input element: ${el.tagName}` };
        }

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el as HTMLInputElement).value = '';
        (el as HTMLInputElement).value = val;
        el.focus();

        el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: val }));
        el.dispatchEvent(new Event('change', { bubbles: true }));

        return { success: true, value: (el as HTMLInputElement).value };
      }, [selector, value]);

      return result as BrowserActionResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async type(selector: string, text: string): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await this.ensureContentScript(tabId);

      const result = await this.executeInPage(tabId, (sel: string, txt: string) => {
        const el = document.querySelector(sel);
        if (!el) return { success: false, error: `Element not found: ${sel}` };
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
          return { success: false, error: `Not an input element: ${el.tagName}` };
        }

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();

        for (const char of txt) {
          (el as HTMLInputElement).value += char;
          el.dispatchEvent(new InputEvent('input', { bubbles: true, data: char }));
        }

        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, value: (el as HTMLInputElement).value };
      }, [selector, text]);

      return result as BrowserActionResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async scroll(selector?: string, direction: 'up' | 'down' = 'down', distance = 300): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await this.ensureContentScript(tabId);

      const result = await this.executeInPage(
        tabId,
        (sel: string | undefined, dir: string, dist: number) => {
          if (sel) {
            const el = document.querySelector(sel);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return { success: true, scrolledTo: sel };
            }
          }

          const scrollDist = dir === 'up' ? -dist : dist;
          window.scrollBy({ top: scrollDist, left: 0, behavior: 'smooth' });
          return { success: true, scrollPosition: { x: window.scrollX, y: window.scrollY } };
        },
        [selector, direction, distance],
      );

      return result as BrowserActionResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async wait(selector?: string, timeout = 5000): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await this.ensureContentScript(tabId);

      const result = await this.executeInPage(
        tabId,
        async (sel: string | undefined, ms: number) => {
          if (!sel) {
            await new Promise<void>((r) => setTimeout(r, ms));
            return { success: true, waited: ms };
          }

          const start = Date.now();
          while (Date.now() - start < ms) {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) {
              return { success: true, element: el.tagName, text: el.textContent?.slice(0, 50) };
            }
            await new Promise<void>((r) => setTimeout(r, 100));
          }
          return { success: false, error: `Element not found within ${ms}ms: ${sel}` };
        },
        [selector, timeout],
      );

      return result as BrowserActionResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async takeScreenshot(fullPage = false): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      const dataUrl = await browser.tabs.captureVisibleTab(undefined, {
        format: 'png',
        quality: fullPage ? 80 : 100,
      });
      return { success: true, result: { screenshot: dataUrl } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async extract(selector?: string): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await this.ensureContentScript(tabId);

      const result = await this.executeInPage(tabId, (sel: string | undefined) => {
        const els = sel ? document.querySelectorAll(sel) : document.body?.querySelectorAll('*') || [];
        const texts: string[] = [];
        for (const el of Array.from(els)) {
          if (el.offsetParent !== null) {
            const t = el.textContent?.trim();
            if (t) texts.push(t.slice(0, 200));
          }
        }
        return { success: true, data: texts.slice(0, 50) };
      }, [selector]);

      return result as BrowserActionResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async hover(selector: string): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await this.ensureContentScript(tabId);

      const result = await this.executeInPage(tabId, (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return { success: false, error: `Element not found: ${sel}` };

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));

        return { success: true, tag: el.tagName, text: el.textContent?.slice(0, 50) };
      }, [selector]);

      return result as BrowserActionResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async selectOption(selector: string, value: string): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await this.ensureContentScript(tabId);

      const result = await this.executeInPage(tabId, (sel: string, val: string) => {
        const el = document.querySelector(sel);
        if (!el) return { success: false, error: `Element not found: ${sel}` };
        if (el.tagName !== 'SELECT') return { success: false, error: `Not a select element: ${el.tagName}` };

        const selectEl = el as HTMLSelectElement;
        const options = Array.from(selectEl.options);
        const match = options.find(
          (o) => o.value === val || o.text === val,
        );
        if (!match) return { success: false, error: `Option not found: ${val}` };

        selectEl.value = match.value;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));

        return { success: true, selected: match.value };
      }, [selector, value]);

      return result as BrowserActionResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async dragAndDrop(source: string, target: string): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await this.ensureContentScript(tabId);

      const result = await this.executeInPage(tabId, (src: string, tgt: string) => {
        const sourceEl = document.querySelector(src);
        if (!sourceEl) return { success: false, error: `Source not found: ${src}` };
        const targetEl = document.querySelector(tgt);
        if (!targetEl) return { success: false, error: `Target not found: ${tgt}` };

        const dragStart = new DragEvent('dragstart', { bubbles: true, cancelable: true });
        sourceEl.dispatchEvent(dragStart);

        const drop = new DragEvent('drop', { bubbles: true, cancelable: true });
        targetEl.dispatchEvent(drop);

        const dragEnd = new DragEvent('dragend', { bubbles: true, cancelable: true });
        sourceEl.dispatchEvent(dragEnd);

        return { success: true };
      }, [source, target]);

      return result as BrowserActionResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async press(key: string): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await this.ensureContentScript(tabId);

      const result = await this.executeInPage(tabId, (k: string) => {
        const el = document.activeElement || document.body;
        el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true, cancelable: true }));
        if (k === 'Enter' && el.tagName === 'INPUT') {
          const form = (el as HTMLInputElement).closest('form');
          form?.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
        }
        return { success: true, key: k };
      }, [key]);

      return result as BrowserActionResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async evaluate(script: string): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await this.ensureContentScript(tabId);

      const result = await this.executeInPage(
        tabId,
        (code: string) => {
          try {
            return { success: true, result: new Function('return ' + code)() };
          } catch (e) {
            return { success: false, error: e instanceof Error ? e.message : String(e) };
          }
        },
        [script],
      );

      return result as BrowserActionResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getPageInfo(): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await this.ensureContentScript(tabId);

      const result = await this.executeInPage(tabId, () => {
        const interactiveElements: Array<{ selector: string; text: string; type: string }> = [];
        const selectors = ['button', 'a', 'input', 'textarea', 'select', '[role="button"]', '[onclick]', '[tabindex]'];

        for (const sel of selectors) {
          for (const el of Array.from(document.querySelectorAll(sel))) {
            if (el.offsetParent === null) continue;
            const text = el.textContent?.trim().slice(0, 100) || '';
            if (!text && !el.hasAttribute('aria-label') && el.tagName !== 'INPUT') continue;

            let selector = el.id ? `#${el.id}` : el.className ? `${el.tagName}.${el.className.split(' ')[0]}` : el.tagName;
            interactiveElements.push({ selector, text, type: el.tagName.toLowerCase() });
          }
        }

        return {
          success: true,
          data: {
            url: window.location.href,
            title: document.title,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            interactiveElements: interactiveElements.slice(0, 100),
          },
        };
      });

      return result as BrowserActionResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async goBack(): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await browser.tabs.goBack(tabId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async goForward(): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await browser.tabs.goForward(tabId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async refresh(): Promise<BrowserActionResult> {
    try {
      const tabId = await this.getActiveTabId();
      await browser.tabs.reload(tabId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
