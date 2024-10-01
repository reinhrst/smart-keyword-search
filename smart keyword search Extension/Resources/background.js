import {Rule} from './rules.js'

const IGNORE_URL_PARAMETERS_IN_MATCH = new Set([
    "safari_group",
    "anon_safari_group",
])
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
    duckduckgo: {
        url: "https://duckduckgo.com/",
        expected_query_params: {
            "t": "osx",
            "q": /.*/,
        },
        search_param_name: "q",
    },
    ecosia_with_tts: {
        url: "https://www.ecosia.org/search",
        expected_query_params: {
            "tts": "st_asaf_macos",
            "q": /.*/,
        },
        search_param_name: "q",
    },
    ecosia: {
        url: "https://www.ecosia.org/search",
        expected_query_params: {
            "q": /.*/,
        },
        search_param_name: "q",
    },
}

let rules = null

function updateRules() {
    browser.storage.local.get("rules").then((result) => {
        if (result.rules) {
            rules = result.rules.map(Rule.fromObject);
        } else {
            // save default rules if rules don't exist
            rules = Rule.DEFAULT_RULES.map(Rule.fromObject);
            browser.storage.local.set({"rules": rules})
        }
    })
}

browser.storage.onChanged.addListener(() => {updateRules()})
updateRules()


let recentMatchDates = [];


const doRedirect = (details) => {
    console.log("tripped")
    if (rules === null) {
        console.log("no rules loaded yet")
        return
    }
    const url = new URL(details.url)
    const engines = Object.entries(ENGINES).filter(([_, engine]) => details.url.startsWith(engine.url))
    console.assert(engines.length, `Should always have an engine match: ${url}`)
    
    function findSearch(engine_name, engine) {
        for (const [key, value] of url.searchParams) {
            if (IGNORE_URL_PARAMETERS_IN_MATCH.has(key)) {
                continue;
            }
            const expected_value = engine.expected_query_params[key]
            if (typeof expected_value === 'undefined' ||
                (expected_value.test ? !expected_value.test(value) : expected_value !== value)) {
                            console.log(`Not redirecting because unexpected url parameter ${key} (engine: ${engine_name})`)
                return [null, null]
            }
        }
        for (const [key, value] of Object.entries(engine.expected_query_params)) {
            if (url.searchParams.getAll(key).length != 1) {
                console.log(`Not redirecting because expected url parameter ${key} not present (engine: ${engine_name})`)
                return [null, null]
            }
        }
        const search = url.searchParams.get(engine.search_param_name)
        console.log(`Match for engine ${engine_name}, search = ${JSON.stringify(search)}`)
        return [engine_name, search]
    }
    const [engine_name, search] = engines.map(([engine_name, engine]) => findSearch(engine_name, engine)).filter(s => s[0] !== null)[0]
    if (engine_name === null) {
        console.log("No mathing engine found")
        return
    }
    for (const rule of rules) {
        const match = rule.regex.exec(search)
        if (!match) {
            continue
        }
        console.log(`Found match for: ${rule.regex} (engine: ${engine_name})`)
        const newurl = Object.entries(match.groups || {}).reduce((current, newdata) => {
            return current
            .replace("{" + newdata[0] + "}", encodeURIComponent(newdata[1]))
            .replace("{" + newdata[0] + ":raw}", newdata[1])
        }, rule.target)
        console.log(`Redirecting to ${newurl}`)
        const now = new Date()
        recentMatchDates = recentMatchDates.filter((d) => now - d < 5000)
        if (recentMatchDates.length > 5) {
            console.log("hammering, possibly in loop, not redirecting")
            return
        }
        recentMatchDates.push(now)
        browser.tabs.update(details.tabId, {url: newurl})
        return
    }
    console.log(`No match, (engine: ${engine_name}) continuing to site`);
}

//browser.webNavigation.onBeforeNavigate.addListener(doRedirect, {url: Object.values(ENGINES).map(engine => {
//    const url = new URL(engine.url)
//    return {
//        hostEquals: url.host,
//        pathEquals: url.pathname,
//        schemes: [url.protocol.slice(0, -1)]
//    }
//})})

console.log("started")
