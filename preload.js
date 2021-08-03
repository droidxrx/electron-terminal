const { Terminal } = require("xterm");
const { FitAddon } = require("xterm-addon-fit");
const { ipcRenderer } = require("electron");

let history_write = [],
    curline = "",
    currPos = 0,
    lastpost = true;

const cursorX = (term) => term.buffer.normal.cursorX;
const ansiColor = (hexcolor, text) => {
    if (hexcolor.length === 6) {
        const aRgbHex = hexcolor.match(/.{1,2}/g);
        const aR = {
            R: parseInt(aRgbHex[0], 16),
            G: parseInt(aRgbHex[1], 16),
            B: parseInt(aRgbHex[2], 16),
        };
        return `\u001b[38;2;${aR.R};${aR.G};${aR.B}m${text}\u001b[0m`;
    } else console.error("Only six-digit hex colors are allowed.");
};
const lastArr = (arr) => arr.slice(-1)[0];
const mvArraytoLast = (arr, item) => arr.push(arr.splice(arr.indexOf(item), 1).pop());

const delLine = "\u001b[2K";
const listmap = {
    chart: " !@#$%^&*()_+~`|}{[]:;?><,./\\-='\"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    ckey: ["Enter", "Backspace", "F5", "ArrowUp", "ArrowDown"],
    afterckey: (keyCode, term, cursorX, prompt) => {
        const runKey = {
            Backspace: () => cursorX > 2 && (term.write("\b \b"), (curline = curline.slice(0, -1))),
            F5: () => window.location.reload(),
            Enter: () => {
                if (cursorX > 2 && curline.length > 0) {
                    if (history_write.includes(curline)) lastArr(history_write) != curline && mvArraytoLast(history_write, curline);
                    else history_write.push(curline);

                    currPos = history_write.length - 1;

                    if (["cls", "clear"].includes(curline)) term.write(`${delLine}\r${prompt}`), term.clear();
                    else term.write(`${delLine}\r${prompt}`), ipcRenderer.send("term.data", curline + "\r");

                    lastpost = true;
                } else term.write(`\n${delLine}\r${prompt}`);
                curline = "";
            },
            ArrowUp: () => {
                if (history_write.length > 0) {
                    currPos > 0 && (lastpost ? (lastpost = false) : (currPos -= 1));
                    curline = history_write[currPos];
                    term.write(`${delLine}\r${prompt}${curline}`);
                }
            },
            ArrowDown: () => {
                currPos += 1;
                currPos === history_write.length && (lastpost = true);
                if (currPos === history_write.length || history_write.length === 0) {
                    currPos -= 1;
                    curline = "";
                    term.write(`${delLine}\r${prompt}`);
                } else {
                    curline = history_write[currPos];
                    term.write(`${delLine}\r${prompt}${curline}`);
                }
            },
        };
        runKey[keyCode]();
    },
    typing: (term, printable, ev, cekChart) => (printable && ev.key == "Tab" ? (term.write("    "), (curline += "    ")) : cekChart != undefined && (term.write(cekChart), (curline += cekChart))),
};

const term_options = {
    fontFamily: "Fire Code Nerd, courier, monospace",
    rendererType: "canvas",
    cursorBlink: true,
    cursorStyle: "underline",
};

window.addEventListener("load", function () {
    const term = new Terminal(term_options);
    const fitaddon = new FitAddon();

    term.loadAddon(fitaddon);
    term.open(document.getElementById("terminal"));
    fitaddon.fit();

    term.onResize((size) => {
        const newsize = {
            cols: size.cols,
            rows: size.rows,
        };

        ipcRenderer.send("term.resize", newsize);
    });

    window.addEventListener("resize", function () {
        fitaddon.fit();
    });

    term.onKey((e) => {
        const ev = e.domEvent,
            printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey,
            cekChart = listmap.chart.find((item) => item == ev.key);

        if (listmap.ckey.includes(ev.key)) listmap.afterckey(ev.key, term, cursorX(term), ansiColor("4e9a06", "⮞ "));
        else listmap.typing(term, printable, ev, cekChart);
    });

    ipcRenderer.on("term.sendData", (ev, data) => {
        term.write(data);
    });
});
