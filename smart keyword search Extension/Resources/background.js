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
        optional_query_params: {
          "channel": /[0-9]+/,
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

// sanity check, keys should not be both in expected and optional. Also check that search param is in expected
for (const [engine, engine_data] of Object.entries(ENGINES)) {
    const optional_params = engine_data.optional_query_params ?? {}
    for (const param_name of Object.keys(engine_data.expected_query_params)) {
        if (typeof optional_params[param_name] !== "undefined") {
            throw new Error(`Error in config: Engine ${engine} has ${param_name} in both expected and optional parameters`)
        }
    }
    if (typeof engine_data.expected_query_params[engine_data.search_param_name] === "undefined") {
        throw new Error(`Error in config: Engine ${engine} needs search param ${engine_data.search_param_name} in expected parameters`)
    }
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
        const expected_and_optional_params = Object.assign({}, engine.expected_query_params, engine.optional_query_params ?? {})
        for (const [key, value] of url.searchParams) {
            if (IGNORE_URL_PARAMETERS_IN_MATCH.has(key)) {
                continue;
            }
            const expected_or_optional_value = expected_and_optional_params[key]
            const is_expected_or_optional = typeof expected_or_optional_value !== 'undefined' &&
            (expected_or_optional_value.test ? expected_or_optional_value.test(value) : expected_or_optional_value === value)
            if (!is_expected_or_optional) {
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
    const mapresult = engines.map(([engine_name, engine]) => findSearch(engine_name, engine)).filter(s => s[0] !== null)[0]
    if (typeof mapresult === "undefined") {
        console.log("No mathing engine found")
        return
    }
    const [engine_name, search] = mapresult
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

browser.webRequest.onBeforeRequest.addListener(doRedirect, {
    urls: Object.values(ENGINES).map((engine) => engine.url)}, null)

/** Since there is a bug in macOS 18, we need an extra test on onCompleted */
browser.webRequest.onCompleted.addListener(doRedirect, {
    urls: Object.values(ENGINES).map((engine) => engine.url)}, null)
console.log("running")

console.log({urls: Object.values(ENGINES).map((engine) => engine.url), types: ["main_frame"]})
