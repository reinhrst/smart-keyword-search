import {Rule} from './rules.js'

const ENGINES = {
    google: {
        url: "https://www.google.com/search",
        expected_query_params: {
            "client": "safari",
            "rls": /.*/,
            "q": /.*/,
            "ie": "UTF-8",
            "oe": "UTF-8",
        },
        search_param_name: "q",
    },
    yahoo: {
        url: "https://search.yahoo.com/search",
        expected_query_params: {
            "fr": "aaplw",
            "p": /.*/,
            "ei": "utf-8",
        },
        search_param_name: "p",
    },
    bing: {
        url: "https://www.bing.com/search",
        expected_query_params: {
            "form": "APMCS1",
            "q": /.*/,
            "PC": "APMC",
        },
        search_param_name: "q",
    },
    duckgogo: {
        url: "https://duckduckgo.com/",
        expected_query_params: {
            "t": "osx",
            "q": /.*/,
        },
        search_param_name: "q",
    },
}

var rules = null

function updateRules() {
    browser.storage.local.get("rules").then((result) => {
        rules = (result.rules || []).map((obj) => Rule.fromObject(obj));
    })
}

browser.storage.onChanged.addListener(() => {updateRules()})
updateRules()

browser.webRequest.onBeforeRequest.addListener((details) => {
    console.log("tripped")
    if (rules === null) {
        console.log("no rules loaded yet")
        return
    }
    const url = new URL(details.url)
    const engine = Object.values(ENGINES).filter((engine) => details.url.startsWith(engine.url))[0]
    console.assert(engine, "Should always have an engine match")

    for (const [key, value] of url.searchParams) {
        const expected_value = engine.expected_query_params[key]
        if (typeof expected_value === 'undefined' ||
            (expected_value.test ? !expected_value.test(value) : expected_value !== value)) {
                        console.log(`Not redirecting because unexpected url parameter ${key}`)
            return
        }
    }
    for (const [key, value] of Object.entries(engine.expected_query_params)) {
        if (url.searchParams.getAll(key).length != 1) {
            console.log(`Not redirecting because unexpected url parameter ${key}`)
            return
        }
    }
    const search = url.searchParams.get(engine.search_param_name)
    for (const rule of rules) {
        const match = rule.regex.exec(search)
        if (!match) {
            continue
        }
        console.log(`Found match for: ${rule.regex}`)
        const newurl = Object.entries(match.groups || {}).reduce((current, newdata) => {
            return current
            .replace("{" + newdata[0] + "}", encodeURIComponent(newdata[1]))
            .replace("{" + newdata[0] + ":raw}", newdata[1])
        }, rule.target)
        console.log(`Redirecting to ${newurl}`)
        browser.tabs.update(details.tabId, {url: newurl})
        return
    }
    console.log("No match, continuing to site");
}, {urls: Object.values(ENGINES).map((engine) => engine.url), types: ["main_frame"]}, null)
console.log("running")

console.log({urls: Object.values(ENGINES).map((engine) => engine.url), types: ["main_frame"]})
