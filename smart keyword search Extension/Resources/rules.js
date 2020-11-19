// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
function escapeRegExp(string) {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

class SimpleRule {
    constructor(id, name, prefix, target) {
        this.id = id
        this.name = name
        this.prefix = prefix
        this.target = target
    }
    
    checkErrors() {
        /*
         Returns an array of 2-tuples of [fieldname, human readable error]
         */
        let errors = []
        if (this.prefix === "") {
            errors.push(["prefix", "Prefix should not be empty."])
        }
        if (this.prefix.startsWith(" ")) {
            errors.push(["prefix", "Prefix should not start with a space."])
        }
        if (this.prefix.endsWith(" ")) {
            errors.push(["prefix", "Prefix should not end with a space."])
        }
        if (this.target.indexOf("{search}") === -1) {
            errors.push(["target", "Target should contain {search} somewhere."])
        }
        if (!this.target.startsWith("http://") && !this.target.startsWith("https://" )) {
            errors.push(["target", "Target should start with http(s)://."])
        }
        return errors
    }
    
    get regex() {
        return new RegExp("^" + escapeRegExp(this.prefix) + " (?<search>.*)$")
    }
    
    isAdvanced() {
        return false
    }

    toObject() {
        return {
            id: this.id,
            name: this.name,
            prefix: this.prefix,
            target: this.target,
        }
    }
}

class AdvancedRule {
    constructor(id, name, regexstr, target) {
        this.id = id
        this.name = name
        this.regexstr = regexstr
        this.target = target
    }
    
    checkErrors() {
        /*
         Returns an array of 2-tuples of [fieldname, human readable error]
         */
        let errors = []
        try {
            this.regex
        } catch (err) {
            errors.push(["regexstr", "Not a valid regular expression."])
        }
        if (!this.target.startsWith("http://") && !this.target.startsWith("https://" )) {
            errors.push(["target", "Target should start with http(s)://."])
        }
        return errors
    }

    get regex() {
        return new RegExp(this.regexstr)
    }

    isAdvanced() {
        return true
    }
    
    toObject() {
        return {
            id: this.id,
            name: this.name,
            regexstr: this.regexstr,
            target: this.target,
        }
    }

}
    
class Rule {
    static fromObject(obj) {
        if (Object.entries(obj).length != 4) {
            throw "Not a valid rule, not 4 elements"
        }
        if (!"id" in obj) {
            throw "Required key 'id' missing"
        }
        if (!"name" in obj) {
            throw "Required key 'name' missing"
        }
        if (!"target" in obj) {
            throw "Required key 'target' missing"
        }
        if (!"prefix" in obj && !"regexstr" in obj) {
            throw "Required key 'prefix' or 'regexstr' missing"
        }

        if ("prefix" in obj) {
            return new SimpleRule(obj.id, obj.name, obj.prefix, obj.target)
        } else {
            return new AdvancedRule(obj.id, obj.name, obj.regexstr, obj.target)
        }
    }
    
    static getNewRuleId() {
        return new Date().toISOString() + "_" + Math.floor(Math.random() * 10e15)
    }
    
    static get DEFAULT_RULES() {
        return [
                Rule.fromObject({
                    id: Rule.getNewRuleId(),
                    name: "python",
                    prefix: "p",
                    target: "https://docs.python.org/3/search.html?q={search}&check_keywords=yes&area=default",
            }),
                Rule.fromObject({
                    id: Rule.getNewRuleId(),
                    name: "numpy",
                    prefix: "np",
                    target: "https://numpy.org/doc/stable/search.html?q={search}&check_keywords=yes&area=default",
        }),
                Rule.fromObject({
                    id: Rule.getNewRuleId(),
                    name: "wikipedia English",
                    prefix: "we",
                    target: "https://en.wikipedia.org/wiki/Special:Search?search={search}&go=Go&ns0=1",
        }),
        ]
    }
}

export {Rule};
