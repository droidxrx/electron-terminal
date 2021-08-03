const { app, BrowserWindow, ipcMain } = require("electron");
const pty = require("node-pty");
const os = require("os");
const Path = require("path");

const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
const term = pty.spawn(shell, [], {
    name: "xterm-color",
    cwd: process.env.HOMEPATH,
    env: process.env,
});

let termpid = term.pid;
console.log(`Create Terminal : ${termpid}`);

function createWindow() {
    const win = new BrowserWindow({
        icon: Path.resolve("public/img/terminal.png"),
        minWidth: 1280,
        minHeight: 720,
        width: 1280,
        height: 720,
        autoHideMenuBar: true,
        webPreferences: {
            preload: Path.resolve("preload.js"),
        },
    });

    win.loadFile(Path.resolve("public/index.html"));

    term.onData((data) => {
        win.webContents.send("term.sendData", data);
    });

    ipcMain.on("term.data", (ev, data) => term.write(data));
    ipcMain.on("term.resize", (ev, data) => term.resize(data.cols, data.rows));
}

app.whenReady().then(() => {
    createWindow();

    app.on("before-quit", () => {
        term.kill();
        console.log(`Close Terminal : ${termpid}`);
    });

    app.on("window-all-closed", () => {
        app.quit();
    });
});
