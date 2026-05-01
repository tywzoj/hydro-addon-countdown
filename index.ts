import type { Context, Handler } from "hydrooj";
import { moment, SettingModel, yaml } from "hydrooj";

interface ICountdownEvent {
    readonly name: string;
    readonly date: string;
}

interface ICountdownEventWithDiff extends ICountdownEvent {
    readonly diff: number;
}

interface ICountdownEvents {
    readonly date: string;
    readonly today: ICountdownEventWithDiff[];
    readonly upcoming: ICountdownEventWithDiff[];
    readonly past: ICountdownEventWithDiff[];
}

type HomeHandler = typeof Handler & {
    readonly prototype: Handler & {
        getCountdown(): Promise<ICountdownEvents>;
    };
};

const enum CE_String {
    SettingDescription = "Countdown settings",
    Title = "Events Overview",
    SectionToday = "Today's Events",
    SectionUpcoming = "Upcoming Events",
    SectionPast = "Past Events",
    UpcomingEvent = "{0} — in {1} day(s)",
    PastEvent = "{0} — {1} day(s) ago",
}

const strings: Record<string, Record<CE_String, string>> = {
    zh: {
        [CE_String.SettingDescription]: "倒计时设置",
        [CE_String.Title]: "事件总览",
        [CE_String.SectionToday]: "今日事件",
        [CE_String.SectionUpcoming]: "即将到来",
        [CE_String.SectionPast]: "已过事件",
        [CE_String.UpcomingEvent]: "{0}—还有{1}天",
        [CE_String.PastEvent]: "{0}—{1}天前",
    },
    zh_TW: {
        [CE_String.SettingDescription]: "倒數計時設置",
        [CE_String.Title]: "事件總覽",
        [CE_String.SectionToday]: "今日事件",
        [CE_String.SectionUpcoming]: "即將到來",
        [CE_String.SectionPast]: "已過事件",
        [CE_String.UpcomingEvent]: "{0}—還有{1}天",
        [CE_String.PastEvent]: "{0}—{1}天前",
    },
};

const DATE_FORMAT = "YYYY-M-D";
const SETTING_KEY = "countdown.events";

let cache: ICountdownEvents | null = null;

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
            const todayStr = today.format(DATE_FORMAT);

            if (cache?.date === todayStr) {
                return Promise.resolve(cache);
            }

            const eventsSetting: string = (ctx.setting.get(SETTING_KEY) as string | undefined) || "[]";
            const events = yaml.load(eventsSetting) as ICountdownEvent[];

            cache = {
                date: todayStr,
                today: [],
                upcoming: [],
                past: [],
            };

            for (const event of events) {
                try {
                    const eventDate = moment(event.date);

                    const eventWithDiff: ICountdownEventWithDiff = {
                        name: event.name,
                        date: eventDate.format(DATE_FORMAT),
                        diff: eventDate.diff(today, "days"),
                    };

                    if (eventWithDiff.diff > 0) {
                        cache.upcoming.push(eventWithDiff);
                    } else if (eventWithDiff.diff < 0) {
                        cache.past.push(eventWithDiff);
                    } else {
                        cache.today.push(eventWithDiff);
                    }
                } catch {
                    // Invalid date format, ignore this event
                }
            }

            cache.upcoming.sort((a, b) => a.diff - b.diff);
            cache.past.sort((a, b) => b.diff - a.diff);

            return Promise.resolve(cache);
        };
    });

    ctx.on("system/setting", (args) => {
        if (SETTING_KEY in args) {
            cache = null; // Invalidate cache when settings change
        }
    });
}
