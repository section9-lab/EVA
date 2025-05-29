import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card.tsx";
import { browser } from "wxt/browser";
import { MessageType } from "@/entrypoints/types.ts";
import { useTranslation } from "react-i18next";
import { createOpenAI } from "@ai-sdk/openai"; // Updated import
import { generateText } from "ai"; // Updated import

interface ModelConfig {
  url: string;
  key: string;
  model: string;
}

type TestStatus = "idle" | "testing" | "success" | "failed";

export function ModelSettings() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ModelConfig>({
    url: "",
    key: "",
    model: "",
  });
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");

  useEffect(() => {
    // 从 storage 加载配置
    browser.storage.local.get("modelConfig").then((data) => {
      if (data.modelConfig) {
        setConfig(data.modelConfig as ModelConfig);
      }
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
    setTestStatus("idle"); // 如果用户修改了任何配置，重置测试状态
  };

  const handleSave = async () => {
    await browser.storage.local.set({ modelConfig: config });
    // 可以选择发送消息通知其他部分配置已更新
    await browser.runtime.sendMessage({
      messageType: MessageType.saveModelConfig,
      content: config,
    });
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    const { url, key, model } = config;

    if (!key || !model) {
      setTestStatus("failed");
      return;
    }
    try {
      const openai = createOpenAI({
        apiKey: key,
        baseURL: url,
      });

      const { text: responseText } = await generateText({
        model: openai(model),
        prompt: "Hello",
        // You can add a timeout here if the SDK supports it directly in generateText options
        // or handle it with AbortController if needed for more granular control.
        // For simplicity, we'll rely on default timeouts or server-side timeouts for now.
      });
      alert(responseText);
      setTestStatus("success");
      console.log("Connection test successful:", responseText); // Log success and response
      // alert(responseText); // Replaced alert with console.log as per previous changes
    } catch (error: any) {
      setTestStatus("failed");
      console.error("Connection test failed:", error.message); // Log error
      // alert(error.message); // Replaced alert with console.log
    }
  };

  return (
    <Card>
      <div className="space-y-1.5 p-6 pb-3">
        <h3 className="font-semibold text-left text-base">
          {t("modelSettings")}
        </h3>
      </div>
      <div className="p-6 pt-2 space-y-4">
        <div>
          <Label htmlFor="modelUrl">{t("modelUrl")}</Label>
          <Input
            id="modelUrl"
            name="url"
            value={config.url}
            onChange={handleChange}
            placeholder="https://api.example.com/v1"
          />
        </div>
        <div>
          <Label htmlFor="modelKey">{t("modelKey")}</Label>
          <Input
            id="modelKey"
            name="key"
            type="password"
            value={config.key}
            onChange={handleChange}
            placeholder="your-api-key"
          />
        </div>
        <div>
          <Label htmlFor="modelName">{t("modelName")}</Label>
          <Input
            id="modelName"
            name="model"
            value={config.model}
            onChange={handleChange}
            placeholder="gpt-3.5-turbo"
          />
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleSave}>{t("save")}</Button>
          <Button
            onClick={handleTestConnection}
            disabled={testStatus === "testing"}
          >
            {t("test")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
