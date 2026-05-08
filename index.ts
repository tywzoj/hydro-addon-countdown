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
    SettingDescription = "CountdownEvent_SettingDescription",
    Title = "CountdownEvent_Title",
    SectionToday = "CountdownEvent_SectionToday",
    SectionUpcoming = "CountdownEvent_SectionUpcoming",
    SectionPast = "CountdownEvent_SectionPast",
    UpcomingEvent = "CountdownEvent_UpcomingEvent",
    PastEvent = "CountdownEvent_PastEvent",
}

const strings: Record<string, Record<CE_String, string>> = {
    en: {
        [CE_String.SettingDescription]: "Countdown settings",
        [CE_String.Title]: "Events Overview",
        [CE_String.SectionToday]: "Today's Events",
        [CE_String.SectionUpcoming]: "Upcoming Events",
        [CE_String.SectionPast]: "Past Events",
        [CE_String.UpcomingEvent]: `
            <span class="event-list__item__left">{0}</span>
            <span class="event-list__item__right">— in <span class="event-list__item__number">{1}</span> day(s)</span>`,
        [CE_String.PastEvent]: `
            <span class="event-list__item__left">{0}</span>
            <span class="event-list__item__right">— <span class="event-list__item__number">{1}</span> day(s) ago</span>`,
    },
    zh: {
        [CE_String.SettingDescription]: "倒计时设置",
        [CE_String.Title]: "事件总览",
        [CE_String.SectionToday]: "今日事件",
        [CE_String.SectionUpcoming]: "即将到来",
        [CE_String.SectionPast]: "已过事件",
        [CE_String.UpcomingEvent]: `
            <span class="event-list__item__left">{0}</span>
            <span class="event-list__item__right">— 还有<span class="event-list__item__number">{1}</span>天</span>`,
        [CE_String.PastEvent]: `
            <span class="event-list__item__left">{0}</span>
            <span class="event-list__item__right">— <span class="event-list__item__number">{1}</span>天前</span>`,
    },
    zh_TW: {
        [CE_String.SettingDescription]: "倒數計時設置",
        [CE_String.Title]: "事件總覽",
        [CE_String.SectionToday]: "今日事件",
        [CE_String.SectionUpcoming]: "即將到來",
        [CE_String.SectionPast]: "已過事件",
        [CE_String.UpcomingEvent]: `
            <span class="event-list__item__left">{0}</span>
            <span class="event-list__item__right">— 還有<span class="event-list__item__number">{1}</span>天</span>`,
        [CE_String.PastEvent]: `
            <span class="event-list__item__left">{0}</span>
            <span class="event-list__item__right">— <span class="event-list__item__number">{1}</span>天前</span>`,
    },
    ko: {
        [CE_String.SettingDescription]: "카운트다운 설정",
        [CE_String.Title]: "이벤트 개요",
        [CE_String.SectionToday]: "오늘의 이벤트",
        [CE_String.SectionUpcoming]: "다가오는 이벤트",
        [CE_String.SectionPast]: "지난 이벤트",
        [CE_String.UpcomingEvent]: `
            <span class="event-list__item__left">{0}</span>
            <span class="event-list__item__right">— <span class="event-list__item__number">{1}</span>일 남음</span>`,
        [CE_String.PastEvent]: `
            <span class="event-list__item__left">{0}</span>
            <span class="event-list__item__right">— <span class="event-list__item__number">{1}</span>일 전</span>`,
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
            const today = moment().startOf("day");
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
                    const eventDate = moment(event.date).startOf("day");

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
