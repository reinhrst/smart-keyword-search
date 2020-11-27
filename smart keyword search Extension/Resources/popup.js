import {Rule} from './rules.js'

const HELP_URL = "https://www.claude.nl/help";

document.querySelector("#description .more").addEventListener("click", (event) => {
    document.querySelector("#description").classList.toggle("collapsed")
})

document.querySelector("#addrule").addEventListener("click", (event) => {
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

document.querySelector("#editrule").addEventListener("click", (event) => {
    getActiveRule().then((rule) => {editRule(rule)})
})

document.querySelector("#deleterule").addEventListener("click", (event) => {
    getActiveRule().then((rule) => {
        document.querySelector("#deleteconfirm .name").innerText = rule.name;
        document.querySelector("#deleteconfirm input[name=id]").value = rule.id;
        open_modal("deleteconfirm");
    })
})

document.querySelector("#editpage button[name=submit]").addEventListener("click", (event) => {
    updateRuleFromEdit()
    .then(() => {document.querySelector("#editpage").classList.add("hidden")})
    .catch((errors) => {console.log("Editing failed because of", errors)})
})

document.querySelector("#deleteconfirm button.yes").addEventListener("click", (event) => {
    const rule_id = document.querySelector("#deleteconfirm input[name=id]").value
    browser.storage.local.get("rules").then((result) => {
        let rules = result.rules.map(Rule.fromObject);
        rules = rules.filter((rule) => rule.id !== rule_id)
        browser.storage.local.set({"rules": rules}).then(() => {
            document.querySelector("#deleteconfirm").classList.add("hidden")
        })
    })
})

document.querySelector("#editpage input[name=advanced]").addEventListener("change", (event) => {
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
    modal.querySelectorAll("button.modal_close").forEach((button) => { button.addEventListener("click", (event) => {modal.classList.add("hidden")})
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

            tr.addEventListener("click", (event) => {
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
