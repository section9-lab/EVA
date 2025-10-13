import { defineContentScript } from 'wxt/sandbox';

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    // 标记内容脚本已注入
    if (window.__EVA_CONTENT_SCRIPT_INJECTED__) {
      return;
    }

    window.__EVA_CONTENT_SCRIPT_INJECTED__ = true;

    // 创建内容脚本API
    window.__EVA_CONTENT_SCRIPT_API__ = {
      // 标记内容脚本准备就绪
      ready: true,

      // 执行页面操作的主函数
      async executeAction(action: any): Promise<any> {
        try {
          switch (action.type) {
            case 'click_element':
              return await this.clickElement(action.selector, action.options);

            case 'type_text':
              return await this.typeText(action.selector, action.text, action.options);

            case 'scroll_page':
              return await this.scrollPage(action.direction, action.distance, action.selector);

            case 'take_screenshot':
              return await this.takeScreenshot(action.options);

            case 'extract_content':
              return await this.extractContent(action.selector, action.type, action.maxItems);

            case 'wait_for_element':
              return await this.waitForElement(action.selector, action.timeout, action.state);

            case 'check_element_exists':
              return await this.checkElementExists(action.selector);

            case 'navigate':
              return await this.navigate(action.url, action.options);

            default:
              throw new Error(`Unknown action type: ${action.type}`);
          }
        } catch (error) {
          console.error('Error executing action:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      },

      // 点击元素
      async clickElement(selector: string, options: any = {}): Promise<any> {
        const element = await this.findElement(selector);

        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }

        if (options.waitForVisible && !this.isVisible(element)) {
          throw new Error(`Element not visible: ${selector}`);
        }

        // 滚动到元素
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // 等待一下确保元素可见
        await this.wait(200);

        // 设置焦点
        element.focus();

        if (options.rightClick) {
          const clickEvent = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          element.dispatchEvent(clickEvent);
        } else {
          const clickOptions = {
            bubbles: true,
            cancelable: true,
            view: window,
            ctrlKey: options.modifiers?.includes('Ctrl') || false,
            shiftKey: options.modifiers?.includes('Shift') || false,
            altKey: options.modifiers?.includes('Alt') || false,
            metaKey: options.modifiers?.includes('Meta') || false,
            detail: options.doubleClick ? 2 : 1
          };

          const clickEvent = new MouseEvent('mousedown', clickOptions);
          element.dispatchEvent(clickEvent);

          if (options.doubleClick) {
            await this.wait(100);
            const doubleClickEvent = new MouseEvent('dblclick', clickOptions);
            element.dispatchEvent(doubleClickEvent);
          } else {
            const clickUpEvent = new MouseEvent('mouseup', clickOptions);
            element.dispatchEvent(clickUpEvent);

            if (element.tagName === 'INPUT' || element.tagName === 'BUTTON') {
              const focusEvent = new FocusEvent('focus');
              element.dispatchEvent(focusEvent);

              if (element.tagName === 'INPUT' && (element as HTMLInputElement).type === 'submit') {
                const form = element.closest('form');
                if (form) {
                  form.submit();
                }
              }
            }
          }
        }

        return { success: true, element: this.getElementInfo(element) };
      },

      // 输入文本
      async typeText(selector: string, text: string, options: any = {}): Promise<any> {
        const element = await this.findElement(selector);

        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }

        if (!this.isInput(element)) {
          throw new Error(`Element is not an input field: ${selector}`);
        }

        // 聚焦元素
        element.focus();

        // 清除现有文本
        if (options.clearFirst) {
          (element as HTMLInputElement).value = '';
        }

        // 触发focus事件
        const focusEvent = new FocusEvent('focus');
        element.dispatchEvent(focusEvent);

        // 输入文本
        if (options.delay && options.delay > 0) {
          for (let i = 0; i < text.length; i++) {
            (element as HTMLInputElement).value += text[i];

            // 触发input事件
            const inputEvent = new InputEvent('input', {
              bubbles: true,
              cancelable: true,
              data: text[i]
            });
            element.dispatchEvent(inputEvent);

            await this.wait(options.delay);
          }
        } else {
          (element as HTMLInputElement).value = text;

          // 触发input事件
          const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            data: text
          });
          element.dispatchEvent(inputEvent);
        }

        // 触发change事件
        const changeEvent = new Event('change', { bubbles: true });
        element.dispatchEvent(changeEvent);

        return { success: true, value: (element as HTMLInputElement).value };
      },

      // 滚动页面
      async scrollPage(direction: string, distance?: number, selector?: string): Promise<any> {
        if (selector) {
          const element = await this.findElement(selector);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return { success: true, scrolledTo: selector };
          }
        } else {
          const scrollDistance = distance || 300;

          switch (direction) {
            case 'up':
              window.scrollBy({ top: -scrollDistance, left: 0, behavior: 'smooth' });
              break;
            case 'down':
              window.scrollBy({ top: scrollDistance, left: 0, behavior: 'smooth' });
              break;
            case 'left':
              window.scrollBy({ top: 0, left: -scrollDistance, behavior: 'smooth' });
              break;
            case 'right':
              window.scrollBy({ top: 0, left: scrollDistance, behavior: 'smooth' });
              break;
          }
        }

        await this.wait(500);

        return {
          success: true,
          scrollPosition: {
            x: window.scrollX,
            y: window.scrollY
          }
        };
      },

      // 截图
      async takeScreenshot(options: any = {}): Promise<any> {
        // 注意：内容脚本不能直接截图，需要通过background script
        // 这里我们返回页面信息，background script会处理实际截图

        const pageInfo = {
          url: window.location.href,
          title: document.title,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            scrollX: window.scrollX,
            scrollY: window.scrollY
          },
          timestamp: Date.now()
        };

        // 通知background script进行截图
        if (browser && browser.runtime) {
          try {
            const response = await browser.runtime.sendMessage({
              action: 'takeScreenshot',
              pageInfo,
              options
            });
            return response;
          } catch (error) {
            console.error('Failed to send screenshot request:', error);
          }
        }

        return { success: false, error: 'Screenshot functionality requires background script' };
      },

      // 提取内容
      async extractContent(selector?: string, type: string = 'text', maxItems: number = 100): Promise<any> {
        const elements = selector ?
          document.querySelectorAll(selector) :
          document.body?.querySelectorAll('*') || [];

        const results: any[] = [];
        const items = Array.from(elements).slice(0, maxItems);

        for (const element of items) {
          if (!this.isVisible(element)) continue;

          const info = this.getElementInfo(element);

          switch (type) {
            case 'text':
              results.push(info.text);
              break;
            case 'links':
              if (element.tagName === 'A') {
                results.push({
                  text: info.text,
                  href: (element as HTMLAnchorElement).href,
                  title: info.title
                });
              }
              break;
            case 'images':
              if (element.tagName === 'IMG') {
                results.push({
                  src: (element as HTMLImageElement).src,
                  alt: (element as HTMLImageElement).alt,
                  title: info.title
                });
              }
              break;
            case 'forms':
              if (element.tagName === 'FORM') {
                results.push(this.getFormInfo(element as HTMLFormElement));
              }
              break;
            default:
              results.push(info);
          }
        }

        return { success: true, data: results };
      },

      // 等待元素
      async waitForElement(selector: string, timeout = 5000, state = 'visible'): Promise<any> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
          const element = document.querySelector(selector);

          if (element) {
            switch (state) {
              case 'visible':
                if (this.isVisible(element)) {
                  return { success: true, element: this.getElementInfo(element) };
                }
                break;
              case 'hidden':
                if (!this.isVisible(element)) {
                  return { success: true, element: this.getElementInfo(element) };
                }
                break;
              case 'attached':
                return { success: true, element: this.getElementInfo(element) };
            }
          } else if (state === 'detached') {
            return { success: true, message: 'Element is detached' };
          }

          await this.wait(100);
        }

        throw new Error(`Element ${selector} did not reach state ${state} within ${timeout}ms`);
      },

      // 检查元素是否存在
      checkElementExists(selector: string): any {
        const element = document.querySelector(selector);
        return {
          success: true,
          exists: !!element,
          visible: element ? this.isVisible(element) : false
        };
      },

      // 导航到新URL
      async navigate(url: string, options: any = {}): Promise<any> {
        if (options.newTab) {
          window.open(url, '_blank');
        } else {
          window.location.href = url;
        }

        return { success: true, url };
      },

      // 辅助方法
      async findElement(selector: string): Promise<Element | null> {
        try {
          // 支持CSS选择器和文本内容
          if (selector.startsWith('"') && selector.endsWith('"')) {
            const text = selector.slice(1, -1);
            return this.findElementByText(text);
          }

          return document.querySelector(selector);
        } catch (error) {
          console.error('Error finding element:', error);
          return null;
        }
      },

      findElementByText(text: string): Element | null {
        const walker = document.createTreeWalker(
          document.body!,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              return node.textContent?.trim().includes(text) ?
                NodeFilter.FILTER_ACCEPT :
                NodeFilter.FILTER_REJECT;
            }
          }
        );

        const textNode = walker.nextNode();
        return textNode?.parentElement || null;
      },

      isVisible(element: Element): boolean {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               style.opacity !== '0' &&
               element.offsetParent !== null;
      },

      isInput(element: Element): boolean {
        return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
      },

      getElementInfo(element: Element): any {
        return {
          tagName: element.tagName,
          id: element.id || '',
          className: element.className || '',
          text: element.textContent?.substring(0, 100) || '',
          href: (element as HTMLAnchorElement).href || '',
          src: (element as HTMLImageElement).src || '',
          visible: this.isVisible(element),
          attributes: this.getElementAttributes(element)
        };
      },

      getElementAttributes(element: Element): Record<string, string> {
        const attrs: Record<string, string> = {};
        for (const attr of element.attributes) {
          attrs[attr.name] = attr.value;
        }
        return attrs;
      },

      getFormInfo(form: HTMLFormElement): any {
        return {
          action: form.action,
          method: form.method,
          fields: Array.from(form.elements).map(field => ({
            name: (field as HTMLInputElement).name,
            type: (field as HTMLInputElement).type,
            value: (field as HTMLInputElement).value,
            id: (field as HTMLInputElement).id,
            placeholder: (field as HTMLInputElement).placeholder
          }))
        };
      },

      getLinksInfo(): any[] {
        return Array.from(document.querySelectorAll('a'))
          .filter(this.isVisible)
          .slice(0, 100)
          .map(link => ({
            text: link.textContent?.substring(0, 100) || '',
            href: link.href,
            title: link.title
          }));
      },

      getImagesInfo(): any[] {
        return Array.from(document.querySelectorAll('img'))
          .filter(this.isVisible)
          .slice(0, 100)
          .map(img => ({
            src: img.src,
            alt: img.alt,
            title: img.title,
            width: img.width,
            height: img.height
          }));
      },

      async wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
      }
    };

    // 标记内容脚本准备就绪
    window.__EVA_CONTENT_SCRIPT_READY__ = true;

    // 通知background script内容脚本已准备就绪
    if (browser && browser.runtime) {
      try {
        browser.runtime.sendMessage({
          action: 'contentScriptReady',
          url: window.location.href,
          title: document.title
        });
      } catch (error) {
        console.error('Failed to notify background script:', error);
      }
    }

    console.log('EVA Content Script loaded and ready');
  }
});