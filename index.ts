import type { Context, Handler } from "hydrooj";
import { moment, SettingModel, yaml } from "hydrooj";

interface ICountdownEvent {
    name: string;
    date: string;
}

interface ICountdownEventWithDiff extends ICountdownEvent {
    diff: number;
}

interface ICountdownEvents {
    today: ICountdownEventWithDiff[];
    upcoming: ICountdownEventWithDiff[];
    past: ICountdownEventWithDiff[];
}

type HomeHandler = typeof Handler & {
    prototype: Handler & {
        getCountdown(): Promise<ICountdownEvents>;
    };
};

const enum CE_String {
    SettingDescription = "Countdown settings",
    Title = "Events Overview",
    SectionToday = "Today",
    SectionUpcoming = "Upcoming",
    SectionPast = "Past",
    UpcomingEvent = "{0} — {1} day(s) left",
    PastEvent = "{0} — {1} day(s) ago",
}

const strings: Record<string, Record<CE_String, string>> = {
    zh: {
        [CE_String.SettingDescription]: "倒计时设置",
        [CE_String.Title]: "事件总览",
        [CE_String.SectionToday]: "今日事件",
        [CE_String.SectionUpcoming]: "即将到来",
        [CE_String.SectionPast]: "已过事件",
        [CE_String.UpcomingEvent]: "距离 {0} 还有 {1} 天",
        [CE_String.PastEvent]: "距离 {0} 已过去 {1} 天",
    },
    zh_TW: {
        [CE_String.SettingDescription]: "倒數計時設置",
        [CE_String.Title]: "事件總覽",
        [CE_String.SectionToday]: "今日事件",
        [CE_String.SectionUpcoming]: "即將到來",
        [CE_String.SectionPast]: "已過事件",
        [CE_String.UpcomingEvent]: "距離 {0} 還有 {1} 天",
        [CE_String.PastEvent]: "距離 {0} 已過去 {1} 天",
    },
};

const SETTING_KEY = "countdown.events";

const todayCache: {
    date?: string;
    events?: ICountdownEvents;
} = {};

export function apply(ctx: Context) {
    ctx.inject(["setting"], (ctx) => {
        ctx.setting.SystemSetting(
            SettingModel.Setting("setting_basic", SETTING_KEY, [], "yaml", SETTING_KEY, CE_String.SettingDescription),
        );
    });

    Object.entries(strings).forEach(([lang, translations]) => {
        ctx.i18n.load(lang, translations);
    });

    ctx.withHandlerClass("HomeHandler", (handler) => {
        const HomeHandler = handler as HomeHandler;

        HomeHandler.prototype.getCountdown = function () {
            const today = moment();
            const todayStr = today.format("YYYY-MM-DD");

            if (todayCache.date === todayStr && todayCache.events) {
                return todayCache.events;
            }

            const eventsSetting: string = (ctx.setting.get(SETTING_KEY) as string | undefined) || "[]";
            const events = yaml.load(eventsSetting) as ICountdownEvent[];

            const result: ICountdownEvents = {
                today: [],
                upcoming: [],
                past: [],
            };

            events.forEach((event) => {
                try {
                    const eventDate = moment(event.date);
                    const diff = Math.floor((eventDate.unix() - today.unix()) / (60 * 60 * 24));

                    if (diff > 0) {
                        result.upcoming.push({ ...event, diff });
                    } else if (diff < 0) {
                        result.past.push({ ...event, diff: -diff });
                    } else {
                        result.today.push({ ...event, diff: 0 });
                    }
                } catch {
                    // Invalid date format, ignore this event
                }
            });

            todayCache.date = todayStr;
            todayCache.events = result;

            return Promise.resolve(result);
        };
    });
}
