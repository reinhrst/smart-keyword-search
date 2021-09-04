import {Rule} from './rules.js'

document.querySelectorAll(".description").forEach((el) => {
    el.querySelector("a.more").addEventListener("click", (_event) => {
        el.classList.toggle("collapsed")
    })
})

document.querySelector("#openabout").addEventListener("click", (_event) => {
    open_modal("aboutpage");
})

document.querySelector("#openadmin").addEventListener("click", (_event) => {
    open_modal("adminpage");
})

document.querySelector("#domanualeditjson").addEventListener("click", (_event) => {
    document.querySelector("#manualeditjson .message").innerText = ""
    open_modal("manualeditjson");
    browser.storage.local.get("rules").then((result) => {
        const rules_no_id = result.rules.map((rule) => {
            let newrule = Object.assign(rule)
            delete newrule["id"]
            return newrule
        })
        document.querySelector("#jsoneditor").value = JSON.stringify({
            "version": 1,
            "rules": rules_no_id}, null, 4)
    })
})

document.querySelector("#manualeditjson button[name=copy]").addEventListener("click", (_event) => {
    document.querySelector("#jsoneditor").select()
    document.execCommand("copy")
    document.querySelector("#manualeditjson .message").innerText = "Copied to clipboard"
    document.querySelector("#manualeditjson .message").classList.remove("error")
    document.querySelector("#manualeditjson .message").classList.add("ok")
})

document.querySelector("#manualeditjson button[name=clear]").addEventListener("click", (_event) => {
    document.querySelector("#jsoneditor").value = JSON.stringify({
        "version": 1,
        "rules": []}, null, 4)
    document.querySelector("#manualeditjson .message").innerText = "All rules have been removed. If this is not what you wanted, you may click 'cancel'."
    document.querySelector("#manualeditjson .message").classList.remove("error")
    document.querySelector("#manualeditjson .message").classList.add("ok")
})

document.querySelector("#manualeditjson button[name=submit]").addEventListener("click", (_event) => {
    const json = document.querySelector("#jsoneditor").value
    let rawrules
    try {
        rawrules = JSON.parse(json)
    } catch (error) {
        document.querySelector("#manualeditjson .message").innerText = "The submitted code is not valid JSON, the data has not been saved: " + error;
        document.querySelector("#manualeditjson .message").classList.remove("ok")
        document.querySelector("#manualeditjson .message").classList.add("error")
        return false
    }
    if (rawrules.version !== 1) {
        document.querySelector("#manualeditjson .message").innerText = "There needs to be a 'version' key with value 1 (as int). The rules have not been saved."
        document.querySelector("#manualeditjson .message").classList.remove("ok")
        document.querySelector("#manualeditjson .message").classList.add("error")
        return false
    }
    delete rawrules["version"]

    if (!Array.isArray(rawrules.rules)) {
        document.querySelector("#manualeditjson .message").innerText = "There needs to be a 'rules' key with an array as value. The rules have not been saved."
        document.querySelector("#manualeditjson .message").classList.remove("ok")
        document.querySelector("#manualeditjson .message").classList.add("error")
        return false
    }
    let rules = []
    for (const [i, rawrule] of rawrules.rules.entries()) {
        if (!rawrule.id) {
            rawrule.id = Rule.getNewRuleId()
        }
        try {
            rules.push(Rule.fromObject(rawrule))
        } catch (error) {
            document.querySelector("#manualeditjson .message").innerText = `There is a problem with rule ${i + 1}: ${error}. The rules have not been saved.`
            document.querySelector("#manualeditjson .message").classList.remove("ok")
            document.querySelector("#manualeditjson .message").classList.add("error")
            return false
        }

    }

    delete rawrules["rules"]
    if (Object.keys(rawrules).length !== 0) {
        document.querySelector("#manualeditjson .message").innerText = `Unexpected key ${Object.keys(rawrules)[0]} found. The rules have not been saved.`
        document.querySelector("#manualeditjson .message").classList.remove("ok")
        document.querySelector("#manualeditjson .message").classList.add("error")
        return false

    }

    browser.storage.local.set({"rules": rules}).then(() => {
        document.querySelector("#manualeditjson .message").innerText = "Saved."
        document.querySelector("#manualeditjson .message").classList.remove("error")
        document.querySelector("#manualeditjson .message").classList.add("ok")
        window.setTimeout(() => {document.querySelector("#manualeditjson").classList.add("hidden")}, 500);
    })
})


document.querySelector("#addrule").addEventListener("click", (_event) => {
    editRule("new")
})

function getActiveRule() {
    return new Promise((resolve, reject) => {
        const ruleId = document.querySelector("#ruletablebuttons").getAttribute("activeRuleId");
        browser.storage.local.get("rules").then((result) => {
            const rules = result.rules.map(Rule.fromObject);
            for (const rule of rules) {
                if (rule.id == ruleId) {
                    resolve(rule)
                    return
                }
            }
            reject()
        })
    })
}

document.querySelector("#editrule").addEventListener("click", (_event) => {
    getActiveRule().then((rule) => {editRule(rule)})
})

document.querySelector("#deleterule").addEventListener("click", (_event) => {
    getActiveRule().then((rule) => {
        document.querySelector("#deleteconfirm .name").innerText = rule.name;
        document.querySelector("#deleteconfirm input[name=id]").value = rule.id;
        open_modal("deleteconfirm");
    })
})

document.querySelector("#editpage button[name=submit]").addEventListener("click", (_event) => {
    updateRuleFromEdit()
    .then(() => {document.querySelector("#editpage").classList.add("hidden")})
    .catch((errors) => {console.log("Editing failed because of", errors)})
})

document.querySelector("#deleteconfirm button.yes").addEventListener("click", (_event) => {
    const rule_id = document.querySelector("#deleteconfirm input[name=id]").value
    browser.storage.local.get("rules").then((result) => {
        let rules = result.rules.map(Rule.fromObject);
        rules = rules.filter((rule) => rule.id !== rule_id)
        browser.storage.local.set({"rules": rules}).then(() => {
            document.querySelector("#deleteconfirm").classList.add("hidden")
        })
    })
})

document.querySelector("#editpage input[name=advanced]").addEventListener("change", (_event) => {
    if (document.querySelector("#editpage input[name=advanced]").checked) {
        document.querySelector("#editpage #edit").classList.add("advanced")
    } else {
        document.querySelector("#editpage #edit").classList.remove("advanced")
    }
})

document.querySelectorAll("div.modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.classList.add("hidden");            
        }
    })
    modal.querySelectorAll("button.modal_close").forEach((button) => { button.addEventListener("click", (_event) => {modal.classList.add("hidden")})
    })
})

function open_modal(id) {
    let modals = document.querySelectorAll("div.modal")
    for (const modal of modals) {
        if (modal.id === id) {
            modal.classList.remove("hidden")
        } else {
            modal.classList.add("hidden")
        }
    }
}

function updateView() {
    const listbody = document.querySelector("#rulelist > tbody")
    const rulesfooter = document.querySelector("#rulesfooter")

    listbody.querySelectorAll(":scope > tr").forEach((tr) => {tr.remove()})
    document.querySelector("#ruletablebuttons").removeAttribute("activeRuleId")
    rulesfooter.innerHTML = 'Loading... If stuck, see <a href="https://sks.claude-apps.com/#troubleshooting" target="_blank">troubleshooting</a>.'

    browser.storage.local.get("rules").then((result) => {
        const rules = result.rules.map((obj) => Rule.fromObject(obj));
        listbody.querySelectorAll(":scope > tr").forEach((tr) => {tr.remove()})
        document.querySelector("#ruletablebuttons").removeAttribute("activeRuleId")
        if (rules.length === 0) {
            rulesfooter.innerText = "No rules defined."
        } else {
            rulesfooter.innerText = ""
        }
        rules.forEach((rule) => {
            const tr = listbody.appendChild(document.createElement("tr"))
            if (rule.isAdvanced()) {
                tr.classList.add("advanced")
            }
            const namecell = tr.appendChild(document.createElement("td"))
            const prefixcell = tr.appendChild(document.createElement("td"))
            const targetcell = tr.appendChild(document.createElement("td"))
            
            namecell.classList.add("name")
            prefixcell.classList.add("prefix")
            targetcell.classList.add("target")
            
            namecell.innerText = rule.name
            prefixcell.innerText = rule.isAdvanced() ? "***" : rule.prefix
            targetcell.innerText = rule.target
            
            const modifierbuttons = namecell.appendChild(document.createElement("div"))
            modifierbuttons.classList.add("modifierbutton")
            modifierbuttons.classList.add("container")

            tr.addEventListener("click", (_event) => {
                if (tr.classList.contains("active")) {
                    tr.classList.remove("active")
                    document.querySelector("#ruletablebuttons").removeAttribute("activeRuleId")
                } else {
                    document.querySelector("#ruletablebuttons").setAttribute("activeRuleId", rule.id)
                    listbody.querySelectorAll(":scope > tr").forEach((_tr) => {
                        _tr.classList.remove("active")
                        tr.classList.add("active")
                    })
                }
            })
        })
    });
}

function removeAllEditErrors() {
    document.querySelectorAll("#editpage ul.error > li").forEach((li) => li.remove())
}

function editRule(rule) {
    if (rule !== "new" && rule.isAdvanced()) {
        document.querySelector("#editpage input[name=advanced]").checked = true;
        document.querySelector("#editpage #edit").classList.add("advanced")
    } else {
        document.querySelector("#editpage input[name=advanced]").checked = false;
        document.querySelector("#editpage #edit").classList.remove("advanced")
    }

    const modal = document.querySelector("#editpage")
    
    if (rule === "new") {
        modal.classList.remove("edit")
        modal.classList.add("new")
        modal.querySelector("input[name=id]").value = ""
        modal.querySelector("input[name=name]").value = ""
        modal.querySelector("input[name=prefix]").value = ""
        modal.querySelector("input[name=regexstr]").value = ""
        modal.querySelector("input[name=target]").value = ""
    } else {
        modal.classList.add("edit")
        modal.classList.remove("new")
        modal.querySelector("input[name=id]").value = rule.id
        modal.querySelector("input[name=name]").value = rule.name
        if (rule.isAdvanced()) {
            modal.querySelector("input[name=prefix]").value = ""
            modal.querySelector("input[name=regexstr]").value = rule.regexstr
        } else {
            modal.querySelector("input[name=prefix]").value = rule.prefix
            modal.querySelector("input[name=regexstr]").value = ""
        }
        modal.querySelector("input[name=target]").value = rule.target
    }
    removeAllEditErrors();
    open_modal("editpage")
}

function updateRuleFromEdit() {
    return new Promise((resolve, reject) => {
        const modal = document.querySelector("#editpage")
        let ruleobj = {
            id: modal.querySelector("input[name=id]").value,
            name: modal.querySelector("input[name=name]").value,
            target: modal.querySelector("input[name=target]").value,
        }

        if (ruleobj.id === "") {
            ruleobj.id = Rule.getNewRuleId()
        }
        const advanced = document.querySelector("#editpage input[name=advanced]").checked;
        if (advanced) {
            ruleobj.regexstr = modal.querySelector("input[name=regexstr]").value
        } else {
            ruleobj.prefix = modal.querySelector("input[name=prefix]").value
        }
        const newrule = Rule.fromObject(ruleobj);
        const errors = newrule.checkErrors()
        if (errors.length > 0) {
            removeAllEditErrors();
            for (const [errortarget, errormessage] of errors) {
                let li = document.createElement("li")
                li.classList.add("new")
                li.innerText = errormessage
                document.querySelector(`#editpage ul.error.${errortarget}`).appendChild(li)
                window.setTimeout(() => {li.classList.remove("new")}, 300)
            }
            reject(errors)
        } else {
            browser.storage.local.get("rules").then((result) => {
                let rules = result.rules.map(Rule.fromObject);
                const index = rules.findIndex((rule) => rule.id === newrule.id)
                if (index === -1) {
                    rules.push(newrule)
                } else {
                    rules[index] = newrule;
                }
                browser.storage.local.set({"rules": rules}).then(() => {
                    resolve()
                })
            })
        }
    })
}

browser.storage.onChanged.addListener(() => {updateView()})
updateView()
