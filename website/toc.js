document.addEventListener('DOMContentLoaded', function() {
    const ul = document.createElement("ul")
    let ul2 = null
    let h2li = null
    for (const hel of document.querySelectorAll("h2, h3")) {
        if (!hel.id) {
            continue;
        }
        const li = document.createElement("li")
        let a = li.appendChild(document.createElement("a"))
        a.innerText = hel.innerText
        a.href = "#" + hel.id

        if (hel.tagName == "H2") {
            ul.appendChild(li)
            h2li = li
            ul2 = null
        } else {
            if (!ul2) {
                ul2 = h2li.appendChild(document.createElement("ul"))
            }
            ul2.appendChild(li)
        }
    }
    document.getElementById("toc").appendChild(ul);
}, false);
