import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { browser } from "wxt/browser";
import { PlaywrightService } from "@/entrypoints/services/playwright-service";

export function PlaywrightSettings() {
  const { t } = useTranslation();
  const [hostUrl, setHostUrl] = useState('ws://localhost:8765');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [autoConnect, setAutoConnect] = useState(true);
  const [launchHeadless, setLaunchHeadless] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [viewportHeight, setViewportHeight] = useState(720);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const playwrightService = PlaywrightService.getInstance();

  useEffect(() => {
    loadSettings();
    checkConnectionStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await browser.storage.local.get([
        'playwrightHostUrl',
        'playwrightAutoConnect',
        'playwrightHeadless',
        'playwrightViewportWidth',
        'playwrightViewportHeight'
      ]);

      if (data.playwrightHostUrl) setHostUrl(data.playwrightHostUrl);
      if (data.playwrightAutoConnect !== undefined) setAutoConnect(data.playwrightAutoConnect);
      if (data.playwrightHeadless !== undefined) setLaunchHeadless(data.playwrightHeadless);
      if (data.playwrightViewportWidth) setViewportWidth(data.playwrightViewportWidth);
      if (data.playwrightViewportHeight) setViewportHeight(data.playwrightViewportHeight);
    } catch (error) {
      console.error('Error loading Playwright settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await browser.storage.local.set({
        playwrightHostUrl: hostUrl,
        playwrightAutoConnect: autoConnect,
        playwrightHeadless: launchHeadless,
        playwrightViewportWidth: viewportWidth,
        playwrightViewportHeight: viewportHeight
      });

      setTestResult({
        success: true,
        message: t('settings.playwright.settingsSaved')
      });

      setTimeout(() => setTestResult(null), 3000);
    } catch (error) {
      setTestResult({
        success: false,
        message: t('settings.playwright.saveError')
      });
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const connected = await playwrightService.isHostAvailable();
      setIsConnected(connected);
    } catch (error) {
      setIsConnected(false);
    }
  };

  const connectToHost = async () => {
    setIsConnecting(true);
    setTestResult(null);

    try {
      const connected = await playwrightService.connect();
      setIsConnected(connected);

      if (connected) {
        setTestResult({
          success: true,
          message: t('settings.playwright.connectionSuccess')
        });

        // 测试连接
        const result = await playwrightService.getPageInfo();
        if (result.success) {
          setTestResult({
            success: true,
            message: t('settings.playwright.testSuccess')
          });
        }
      } else {
        setTestResult({
          success: false,
          message: t('settings.playwright.connectionFailed')
        });
      }
    } catch (error) {
      setIsConnected(false);
      setTestResult({
        success: false,
        message: t('settings.playwright.connectionError') + ': ' + error.message
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectFromHost = () => {
    playwrightService.disconnect();
    setIsConnected(false);
    setTestResult({
      success: true,
      message: t('settings.playwright.disconnected')
    });
  };

  const startHostProcess = async () => {
    setTestResult({
      success: true,
      message: t('settings.playwright.startingHost')
    });

    try {
      // 这里可以添加启动 Host 进程的逻辑
      // 例如通过 Native Messaging 或者提醒用户手动启动
      setTestResult({
        success: true,
        message: t('settings.playwright.hostInstructions')
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: t('settings.playwright.hostStartError') + ': ' + error.message
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('settings.playwright.title')}</h3>

        {/* 连接状态 */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {isConnected ? t('settings.playwright.connected') : t('settings.playwright.disconnected')}
            </span>
          </div>

          <div className="flex space-x-2">
            {!isConnected ? (
              <Button
                onClick={connectToHost}
                disabled={isConnecting}
                className="flex items-center space-x-2"
              >
                {isConnecting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>{t('settings.playwright.connect')}</span>
              </Button>
            ) : (
              <Button
                onClick={disconnectFromHost}
                variant="outline"
              >
                {t('settings.playwright.disconnect')}
              </Button>
            )}

            <Button
              onClick={startHostProcess}
              variant="outline"
            >
              {t('settings.playwright.startHost')}
            </Button>

            <Button
              onClick={checkConnectionStatus}
              variant="outline"
            >
              {t('settings.playwright.checkStatus')}
            </Button>
          </div>
        </div>

        {/* Host 配置 */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="hostUrl">{t('settings.playwright.hostUrl')}</Label>
            <Input
              id="hostUrl"
              type="text"
              value={hostUrl}
              onChange={(e) => setHostUrl(e.target.value)}
              placeholder="ws://localhost:8765"
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              {t('settings.playwright.hostUrlDescription')}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoConnect"
              checked={autoConnect}
              onChange={(e) => setAutoConnect(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="autoConnect">{t('settings.playwright.autoConnect')}</Label>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">{t('settings.playwright.browserSettings')}</h4>

            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                id="headless"
                checked={launchHeadless}
                onChange={(e) => setLaunchHeadless(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="headless">{t('settings.playwright.headless')}</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="viewportWidth">{t('settings.playwright.viewportWidth')}</Label>
                <Input
                  id="viewportWidth"
                  type="number"
                  value={viewportWidth}
                  onChange={(e) => setViewportWidth(parseInt(e.target.value) || 1280)}
                  min={800}
                  max={2560}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="viewportHeight">{t('settings.playwright.viewportHeight')}</Label>
                <Input
                  id="viewportHeight"
                  type="number"
                  value={viewportHeight}
                  onChange={(e) => setViewportHeight(parseInt(e.target.value) || 720)}
                  min={600}
                  max={1440}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={saveSettings}>
              {t('settings.playwright.saveSettings')}
            </Button>
          </div>

          {/* 测试结果 */}
          {testResult && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              testResult.success
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {testResult.message}
            </div>
          )}
        </div>
      </Card>

      {/* 使用说明 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('settings.playwright.usageGuide')}</h3>

        <div className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium mb-1">1. {t('settings.playwright.guideStep1Title')}</h4>
            <p className="text-gray-600">{t('settings.playwright.guideStep1Description')}</p>
          </div>

          <div>
            <h4 className="font-medium mb-1">2. {t('settings.playwright.guideStep2Title')}</h4>
            <p className="text-gray-600">{t('settings.playwright.guideStep2Description')}</p>
          </div>

          <div>
            <h4 className="font-medium mb-1">3. {t('settings.playwright.guideStep3Title')}</h4>
            <p className="text-gray-600">{t('settings.playwright.guideStep3Description')}</p>
          </div>

          <div>
            <h4 className="font-medium mb-1">4. {t('settings.playwright.guideStep4Title')}</h4>
            <p className="text-gray-600">{t('settings.playwright.guideStep4Description')}</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <p className="font-medium text-blue-800 mb-1">{t('settings.playwright.proTip')}</p>
          <p className="text-blue-700">{t('settings.playwright.proTipDescription')}</p>
        </div>
      </Card>
    </div>
  );
}