// HomePage.js
import * as React from "react";
import { Card } from "@/components/ui/card";
import { ChatContainer, ChatInput, ChatMessage } from "@/components/ui/chat";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  isStreaming?: boolean;
}

export function Home() {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "1",
      content: "你好！我是EVA助手，有什么可以帮助你的吗？",
      isUser: false,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // 滚动到最新消息
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  const addMessageToChat = (message: {
    id: string;
    text: string;
    isUser: boolean;
    isStreaming?: boolean;
  }) => {
    const newMessage: Message = {
      id: message.id,
      content: message.text,
      isUser: message.isUser,
      timestamp: new Date().toLocaleTimeString(),
      isStreaming: message.isStreaming,
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  // New function to update a streaming message
  const updateMessageInChat = (
    id: string,
    newText: string,
    isStreaming: boolean
  ) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === id
          ? {
              ...msg,
              content: newText,
              isStreaming: isStreaming,
              timestamp: new Date().toLocaleTimeString(),
            }
          : msg
      )
    );
  };
  const handleUserMessageSent = (content: string) => {
    console.log("User sent message:", content); // Example: logging or other actions
  };

  const handleSendMessage = (content: string) => {
    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // 模拟AI回复
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `我收到了你的消息: "${content}"`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  return (
    <Card className="flex flex-col w-full h-[90vh] max-h-[90vh]">
      <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4">
        <ChatContainer>
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              isUser={message.isUser}
              message={
                message.isStreaming ? message.content + "..." : message.content
              } // Indicate streaming
              timestamp={message.timestamp}
            />
          ))}
        </ChatContainer>
      </div>
      <ChatInput
        onSend={handleUserMessageSent}
        addMessageToChat={addMessageToChat}
        updateMessageInChat={updateMessageInChat}
      />
    </Card>
  );
}
