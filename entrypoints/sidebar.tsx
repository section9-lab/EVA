import React, {useState} from "react";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {IoMdCloseCircle} from "react-icons/io";
import {IoIosSettings} from "react-icons/io";
import {RiChatAiLine} from "react-icons/ri";
import { browser } from "wxt/browser";
import { History, Plus } from "lucide-react";
import { MessageType } from "@/entrypoints/types.ts";

export enum SidebarType {
    'home' = 'home',
    'settings' = 'settings'
}

const Sidebar = (
    {sideNav, closeContent}: {
        sideNav: (sidebarType: SidebarType) => void,
        closeContent?: () => void
    }) => {
    const [sidebarType, setSidebarType] = useState<SidebarType>(SidebarType.home);

    return (
        <aside
            className="absolute inset-y-0 right-0 z-10 flex w-14 flex-col border-r bg-background border-l-[1px]">
            {closeContent && <a
                className="hover:cursor-pointer flex h-9 w-9 items-center justify-center  text-muted-foreground transition-colors hover:text-foreground ml-auto mr-auto"
                href="#" onClick={() => {
                closeContent()
            }}
            >
                <IoMdCloseCircle className="h-4 w-4 transition-all group-hover:scale-110"/>
                <span className="sr-only">close sidebar</span>
            </a>
            }
            <nav className="flex flex-col items-center gap-4 px-2 py-5">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a
                                className={`hover:cursor-pointer flex h-9 w-9 items-center justify-center  text-muted-foreground transition-colors ${sidebarType == SidebarType.home ? "rounded-sm bg-primary text-lg font-semibold text-primary-foreground" : ""}`}
                                href="#" onClick={() => {
                                setSidebarType(SidebarType.home)
                                sideNav(SidebarType.home)
                            }}
                            >
                                <RiChatAiLine
                                    className={`h-6 w-6 transition-all group-hover:scale-110`}/>
                                <span className="sr-only">home</span>
                            </a>
                        </TooltipTrigger>
                        <TooltipContent side="right">home</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a
                                className="hover:cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                                href="#" onClick={() => {
                                browser.tabs.create({ url: "about:newtab" });
                            }}
                            >
                                <Plus className="h-5 w-5" />
                                <span className="sr-only">New Tab</span>
                            </a>
                        </TooltipTrigger>
                        <TooltipContent side="right">New Tab</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a
                                className="hover:cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                                href="#" onClick={async (e) => {
                                    e.preventDefault();
                                    try {
                                    const history_data = await browser.history.search({
                                        text: '',
                                        maxResults: 10,
                                        startTime: Date.now() - 1000 * 60 * 60 * 24 * 7 // 最近一周
                                    });
                                    console.log("fetch history:", history_data);
                                    browser.runtime.sendMessage({ history_data });
                                    } catch (err) {
                                    console.error("fetch history error:", err);
                                    }
                                }}
                            >
                                <History className="h-5 w-5" />
                                <span className="sr-only">History</span>
                            </a>
                        </TooltipTrigger>
                        <TooltipContent side="right">History</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </nav>
            <nav className="mt-auto flex flex-col items-center gap-4 px-2 py-5">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <a
                                className={`hover:cursor-pointer flex h-9 w-9 items-center justify-center  text-muted-foreground transition-colors ${sidebarType == SidebarType.settings ? "rounded-sm bg-primary text-lg font-semibold text-primary-foreground" : ""} `}
                                href="#" onClick={() => {
                                setSidebarType(SidebarType.settings)
                                sideNav(SidebarType.settings)
                            }}
                            >
                                <IoIosSettings
                                    className={`h-5 w-5`}/>
                                <span className="sr-only">Settings</span>
                            </a>
                        </TooltipTrigger>
                        <TooltipContent side="right">Settings</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </nav>
        </aside>);
};

export default Sidebar;


