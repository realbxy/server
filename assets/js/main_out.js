(function(wHandle, wjQuery) {
    "use strict";
    if (!Date.now) Date.now = function() {
        return (+new Date()).getTime();
    }
    let DATE = Date.now();
    Array.prototype.remove = function(a) {
        const i = this.indexOf(a);
        return i !== -1 && this.splice(i, 1);
    }
    function bytesToColor(r, g, b) {
        let r1 = ("00" + (~~r).toString(16)).slice(-2),
            g1 = ("00" + (~~g).toString(16)).slice(-2),
            b1 = ("00" + (~~b).toString(16)).slice(-2);
        return `#${r1}${g1}${b1}`;
    }
    function colorToBytes(color) {
        if (color.length === 4) return {
            r: parseInt(color[1] + color[1], 16),
            g: parseInt(color[2] + color[2], 16),
            b: parseInt(color[3] + color[3], 16)
        };
        else if (color.length === 7) return {
            r: parseInt(color[1] + color[2], 16),
            g: parseInt(color[3] + color[4], 16),
            b: parseInt(color[5] + color[6], 16)
        };
        throw new Error(`Invalid color: ${color}!`);
    }
    function darkenColor(color) {
        let c = colorToBytes(color);
        return bytesToColor(c.r * .9, c.g * .9, c.b * .9);
    }
    function cleanupObject(object) {
        for (let i in object) delete object[i];
    }
    class Writer {
        constructor(littleEndian) {
            this.writer = true;
            this.tmpBuf = new DataView(new ArrayBuffer(8));
            this._e = littleEndian;
            this.reset();
            return this;
        }
        reset(littleEndian = this._e) {
            this._e = littleEndian;
            this._b = [];
            this._o = 0;
        }
        setUint8(a) {
            if (a >= 0 && a < 256) this._b.push(a);
            return this;
        }
        setInt8(a) {
            if (a >= -128 && a < 128) this._b.push(a);
            return this;
        }
        setUint16(a) {
            this.tmpBuf.setUint16(0, a, this._e);
            this.move(2);
            return this;
        }
        setInt16(a) {
            this.tmpBuf.setInt16(0, a, this._e);
            this.move(2);
            return this;
        }
        setUint32(a) {
            this.tmpBuf.setUint32(0, a, this._e);
            this._move(4);
            return this;
        }
        setInt32(a) {
            this.tmpBuf.setInt32(0, a, this._e);
            this._move(4);
            return this;
        }
        setFloat32(a) {
            this.tmpBuf.setFloat32(0, a, this._e);
            this._move(4);
            return this;
        }
        setFloat64(a) {
            this.tmpBuf.setFloat64(0, a, this._e);
            this._move(8);
            return this;
        }
        _move(b) {
            for (let i = 0; i < b; i++) this._b.push(this.tmpBuf.getUint8(i));
        }
        setStringUTF8(s) {
            const bytesStr = unescape(encodeURIComponent(s));
            for (let i = 0, l = bytesStr.length; i < l; i++) this._b.push(bytesStr.charCodeAt(i));
            this._b.push(0);
            return this;
        }
        build() {
            return new Uint8Array(this._b);
        }
    }
    class Reader {
        constructor(view, offset, littleEndian) {
            this.reader = true;
            this._e = littleEndian;
            if (view) this.repurpose(view, offset);
        }
        repurpose(view, offset) {
            this.view = view;
            this._o = offset || 0;
        }
        getUint8() {
            return this.view.getUint8(this._o++, this._e);
        }
        getInt8() {
            return this.view.getInt8(this._o++, this._e);
        }
        getUint16() {
            return this.view.getUint16((this._o += 2) - 2, this._e);
        }
        getInt16() {
            return this.view.getInt16((this._o += 2) - 2, this._e);
        }
        getUint32() {
            return this.view.getUint32((this._o += 4) - 4, this._e);
        }
        getInt32() {
            return this.view.getInt32((this._o += 4) - 4, this._e);
        }
        getFloat32() {
            return this.view.getFloat32((this._o += 4) - 4, this._e);
        }
        getFloat64() {
            return this.view.getFloat64((this._o += 8) - 8, this._e);
        }
        getStringUTF8() {
            let s = "",
                b;
            while ((b = this.view.getUint8(this._o++)) !== 0) s += String.fromCharCode(b);
            return decodeURIComponent(escape(s));
        }
    }
    class Logger {
        constructor() {
            this.verbosity = 4;
        }
        error(text) {
            if (this.verbosity > 0) console.error(text);
        }
        warn(text) {
            if (this.verbosity > 1) console.warn(text);
        }
        info(text) {
            if (this.verbosity > 2) console.info(text);
        }
        debug(text) {
            if (this.verbosity > 3) console.debug(text);
        }
    }
    class Sound {
        constructor(src, volume, maximum) {
            this.src = src;
            this.volume = typeof volume === "number" ? volume : 0.5;
            this.maximum = typeof maximum === "number" ? maximum : Infinity;
            this.elms = [];
        }
        play(vol) {
            if (typeof vol === "number") this.volume = vol;
            let toPlay = this.elms.find((elm) => elm.paused) ?? this.add();
            toPlay.volume = this.volume;
            toPlay.play();
        }
        add() {
            if (this.elms.length >= this.maximum) return this.elms[0];
            let elm = new Audio(this.src);
            this.elms.push(elm);
            return elm;
        }
    }
    let log = new Logger(),
        SKIN_URL = "./skins/",
        USE_HTTPS = "https:" == wHandle.location.protocol,
        CELL_POINTS_MIN = 5,
        CELL_POINTS_MAX = 120,
        PI_2 = Math.PI * 2,
        UINT8_254 = new Uint8Array([254, 6, 0, 0, 0]),
        UINT8_255 = new Uint8Array([255, 1, 0, 0, 0]),
        UINT8 = {
            1: new Uint8Array([1]),
            17: new Uint8Array([17]),
            21: new Uint8Array([21]),
            18: new Uint8Array([18]),
            19: new Uint8Array([19]),
            22: new Uint8Array([22]),
            23: new Uint8Array([23]),
            24: new Uint8Array([24]),
            25: new Uint8Array([25]),
            26: new Uint8Array([26]),
            27: new Uint8Array([27]),
            28: new Uint8Array([28]),
            30: new Uint8Array([30]),
            31: new Uint8Array([31]),
            29: new Uint8Array([29]),
            33: new Uint8Array([33]),
            34: new Uint8Array([34]),
            35: new Uint8Array([35]),
            36: new Uint8Array([36]),
            37: new Uint8Array([37]),
            38: new Uint8Array([38]),
            39: new Uint8Array([39]),
            40: new Uint8Array([40]),
            41: new Uint8Array([41]),
            42: new Uint8Array([42]),
            43: new Uint8Array([43]),
            254: new Uint8Array([254])
        },
        cells = Object.create({
            mine: [],
            byId: {},
            list: [],
        }),
        border = Object.create({
            left: -2000,
            right: 2000,
            top: -2000,
            bottom: 2000,
            width: 4000,
            height: 4000,
            centerX: -1,
            centerY: -1
        }),
        leaderboard = Object.create({
            type: NaN,
            items: null,
            canvas: document.createElement("canvas"),
            teams: ["#F33", "#3F3", "#33F"]
        }),
        chat = Object.create({
            messages: [],
            waitUntil: 0,
            canvas: document.createElement("canvas"),
            visible: 0,
        }),
        stats = Object.create({
            framesPerSecond: 0,
            latency: NaN,
            supports: null,
            info: null,
            pingLoopId: NaN,
            pingLoopStamp: null,
            canvas: document.createElement("canvas"),
            visible: 0,
            score: NaN,
            maxScore: 0
        }),
        ws = null,
        WS_URL = null,
        isConnected = 0,
        disconnectDelay = 1000,
        syncUpdStamp = Date.now(),
        syncAppStamp = Date.now(),
        mainCanvas = null,
        mainCtx = null,
        soundsVolume,
        loadedSkins = {},
        overlayShown = 0,
        isTyping = 0,
        chatBox = null,
        mapCenterSet = 0,
        camera = {
            x: 0,
            y: 0,
            z: 1,
            zScale: 1,
            viewMult: 1
        },
        target = {
            x: 0,
            y: 0,
            z: 1
        },
        mouse = {
            x: NaN,
            y: NaN,
            z: 1
        },
        settings = {
            mobile: "createTouch" in document,
            showSkins: true,
            showNames: true,
            showColor: true,
            hideChat: false,
            showMinimap: true,
            hideGrid: false,
            hideFood: false,
            hideStats: false,
            showMass: false,
            darkTheme: false,
            cellBorders: true,
            jellyPhysics: false,
            showTextOutline: true,
            infiniteZoom: false,
            transparency: false,
            mapBorders: false,
            s: false,
            showPos: false,
            allowGETipSet: false
        },
        pressed = {
            space: 0,
            w: 0,
            e: 0,
            r: 0,
            t: 0,
            p: 0,
            q: 0,
            o: 0,
            m: 0,
            i: 0,
            y: 0,
            u: 0,
            k: 0,
            l: 0,
            h: 0,
            z: 0,
            x: 0,
            s: 0,
            c: 0,
            g: 0,
            j: 0,
            b: 0,
            v: 0,
            n: 0,
            esc: 0
        },
        eatSound = new Sound("./assets/sound/eat.mp3", .5, 10),
        pelletSound = new Sound("./assets/sound/pellet.mp3", .5, 10);
    function wsCleanup() {
        if (!ws) return;
        log.debug("WS cleanup triggered!");
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
        ws = null;
    }
    function wsInit(url) {
        if (ws) {
            log.debug("websocket init on existing connection!");
            wsCleanup();
        }
        wjQuery("#connecting").show();
        ws = new WebSocket(`ws${USE_HTTPS && !url.includes("127.0.0.1") ? "s" : ""}://${WS_URL = url}`);
        ws.binaryType = "arraybuffer";
        ws.onopen = wsOpen;
        ws.onmessage = wsMessage;
        ws.onerror = wsError;
        ws.onclose = wsClose;
    }
    function wsOpen() {
        isConnected = 1;
        disconnectDelay = 1000;
        wjQuery("#connecting").hide();
        wsSend(UINT8_254);
        wsSend(UINT8_255);
        log.debug(`WS connected, using https: ${USE_HTTPS}`);
        log.info("Socket open.");
    }
    function wsError(error) {
        log.error(error);
        log.info("Socket error.");
    }
    function wsClose(e) {
        isConnected = 0;
        log.debug(`WS disconnected ${e.code} '${e.reason}'`);
        wsCleanup();
        gameReset();
        setTimeout(() => {
            if (ws && ws.readyState === 1) return;
            wsInit(WS_URL);
        }, disconnectDelay *= 1.5);
        log.info("Socket closed.");
    }
    function wsSend(data) {
        if (!ws) return;
        if (ws.readyState !== 1) return;
        if (data.build) ws.send(data.build());
        else ws.send(data);
    }
    function wsMessage(data) {
        syncUpdStamp = Date.now();
        let reader = new Reader(new DataView(data.data), 0, 1),
            packetId = reader.getUint8(),
            killer,
            killed,
            id,
            x,
            y,
            s,
            flags,
            cell,
            updColor,
            updName,
            updSkin,
            count,
            color,
            name,
            skin;
        switch (packetId) {
            case 0x10: // Update nodes
                // Consume records
                count = reader.getUint16();
                for (let i = 0; i < count; i++) {
                    killer = reader.getUint32();
                    killed = reader.getUint32();
                    let _cell = cells.byId.get(killed);
                    if (!cells.byId.has(killer) || !cells.byId.has(killed)) continue;
                    if (soundsVolume.value && cells.mine.includes(killer) && syncUpdStamp - _cell.born > 100) (_cell.s < 20 ? pelletSound : eatSound).play(parseFloat(soundsVolume.value));
                    _cell.destroy(killer);
                }
                // Update records
                while (true) {
                    id = reader.getUint32();
                    if (id === 0) break;
                    x = reader.getInt32();
                    y = reader.getInt32();
                    s = reader.getUint16();
                    flags = reader.getUint8();
                    updColor = !!(flags & 0x02);
                    updName = !!(flags & 0x08);
                    updSkin = !!(flags & 0x04);
                    color = updColor ? bytesToColor(reader.getUint8(), reader.getUint8(), reader.getUint8()) : null;
                    skin = updSkin ? reader.getStringUTF8() : null;
                    name = updName ? reader.getStringUTF8() : null;
                    if (cells.byId.has(id)) {
                        cell = cells.byId.get(id);
                        cell.update(syncUpdStamp);
                        cell.updated = syncUpdStamp;
                        cell.ox = cell.x;
                        cell.oy = cell.y;
                        cell.os = cell.s;
                        cell.nx = x;
                        cell.ny = y;
                        cell.ns = s;
                        if (color) cell.setColor(color);
                        if (skin) cell.setSkin(skin);
                        if (name) cell.setName(name);
                    } else {
                        cell = new Cell(id, x, y, s, name, color, skin, flags);
                        cells.byId.set(id, cell);
                        cells.list.push(cell);
                    }
                }
                // Disappear records
                count = reader.getUint16();
                for (let i = 0; i < count; i++) {
                    killed = reader.getUint32();
                    if (cells.byId.has(killed) && !cells.byId.get(killed).destroyed) cells.byId.get(killed).destroy(null);
                }
                break;
            case 0x11: // Update position
                target.x = reader.getFloat32();
                target.y = reader.getFloat32();
                target.z = reader.getFloat32();
                break;
            case 0x12: // Clear all
                for (let cell of cells.byId.values()) cell.destroy(null);
            case 0x14: // Clear my cells
                cells.mine = [];
                break;
            case 0x15: // Draw line
                log.warn("Got packet 0x15 (draw line) which is unsupported!");
                break;
            case 0x20: // New cell
                cells.mine.push(reader.getUint32());
                break;
            case 0x30: // Draw just text on a leaderboard
                leaderboard.items = [];
                leaderboard.type = "text";
                count = reader.getUint32();
                for (let i = 0; i < count; ++i) leaderboard.items.push(reader.getStringUTF8());
                drawLeaderboard();
                break;
            case 0x31: // Draw FFA leaderboard
                leaderboard.items = [];
                leaderboard.type = "ffa";
                count = reader.getUint32();
                for (let i = 0; i < count; ++i) leaderboard.items.push({
                    me: !!reader.getUint32(),
                    name: reader.getStringUTF8() || "An unnamed cell"
                });
                drawLeaderboard();
                break;
            case 0x32: // Draw Teams leaderboard
                leaderboard.items = [];
                leaderboard.type = "pie";
                count = reader.getUint32();
                for (let i = 0; i < count; ++i) leaderboard.items.push(reader.getFloat32());
                drawLeaderboard();
                break;
            case 0x40: // Set the borders
                border.left = reader.getFloat64();
                border.top = reader.getFloat64();
                border.right = reader.getFloat64();
                border.bottom = reader.getFloat64();
                border.width = border.right - border.left;
                border.height = border.bottom - border.top;
                border.centerX = (border.left + border.right) / 2;
                border.centerY = (border.top + border.bottom) / 2;
                if (data.data.byteLength === 33) break;
                if (!mapCenterSet) {
                    mapCenterSet = 1;
                    camera.x = target.x = border.centerX;
                    camera.y = target.y = border.centerY;
                    camera.z = target.z = 1;
                }
                reader.getUint32(); // game type
                if (!/MultiOgar/.test(reader.getStringUTF8()) || stats.pingLoopId) break;
                stats.pingLoopId = setInterval(() => {
                    wsSend(UINT8[254]);
                    stats.pingLoopStamp = Date.now();
                }, 2000);
                break;
            case 0x63: // chat message
                flags = reader.getUint8();
                color = bytesToColor(reader.getUint8(), reader.getUint8(), reader.getUint8());
                name = reader.getStringUTF8().trim();
                let reg = /\{([\w]+)\}/.exec(name);
                if (reg) name = name.replace(reg[0], "").trim();
                let message = reader.getStringUTF8(),
                    server = !!(flags & 0x80),
                    admin = !!(flags & 0x40),
                    mod = !!(flags & 0x20);
                if (server && name !== "SERVER") name = "[SERVER] " + name;
                if (admin) name = "[ADMIN] " + name;
                if (mod) name = "[MOD] " + name;
                let wait = Math.max(3000, 1000 + message.length * 150);
                chat.waitUntil = syncUpdStamp - chat.waitUntil > 1000 ? syncUpdStamp + wait : chat.waitUntil + wait;
                chat.messages.push({
                    server: server,
                    admin: admin,
                    mod: mod,
                    color: color,
                    name: name,
                    message: message,
                    time: syncUpdStamp
                });
                drawChat();
                break;
            case 0xFE: // server stat
                stats.info = JSON.parse(reader.getStringUTF8());
                stats.latency = syncUpdStamp - stats.pingLoopStamp;
                drawStats();
                break;
            default: // invalid packet
                wsCleanup();
                break;
        }
    }
    function sendMouseMove(x, y) {
        let writer = new Writer(1);
        writer.setUint8(0x10);
        writer.setUint32(x);
        writer.setUint32(y);
        writer._b.push(0, 0, 0, 0);
        wsSend(writer);
    }
    function sendPlay(name, skinUrl) {
        let writer = new Writer(1);
        writer.setUint8(0x00);
        writer.setStringUTF8(name);
        writer.setStringUTF8(skinUrl); // Add skin URL to the packet
        wsSend(writer);
    }
    function sendChat(text) {
        let writer = new Writer();
        writer.setUint8(0x63);
        writer.setUint8(0);
        writer.setStringUTF8(text);
        wsSend(writer);
        writer.setUint8(0);
        writer.setStringUTF8(text);
        wsSend(writer);
    }
    function gameReset() {
        cleanupObject(cells);
        cleanupObject(border);
        cleanupObject(leaderboard);
        cleanupObject(chat);
        cleanupObject(stats);
        chat.messages = [];
        leaderboard.items = [];
        cells.mine = [];
        cells.byId = new Map();
        cells.list = [];
        camera.x = camera.y = target.x = target.y = 0;
        camera.z = target.z = 1;
        mapCenterSet = 0;
    }
    if (null !== wHandle.localStorage) wjQuery(window).load(function() {
        wjQuery(".save").each(function() {
            let id = wjQuery(this).data("box-id"),
                value = wHandle.localStorage.getItem("checkbox-" + id);
            if (value && value == "true" && id > 0) {
                wjQuery(this).prop("checked", "true");
                wjQuery(this).trigger("change");
            } else if (id < 1 && value != null) wjQuery(this).val(value);
        });
        wjQuery(".save").change(function() {
            let id = wjQuery(this).data("box-id"),
                value = id < 1 ? wjQuery(this).val() : wjQuery(this).prop("checked");
            wHandle.localStorage.setItem("checkbox-" + id, value);
        });
    });
    function hideOverlay() {
        overlayShown = 0;
        wjQuery("#overlays").fadeOut(200);
    }
    function showOverlay() {
        overlayShown = 1;
        wjQuery("#overlays").fadeIn(300);
    }
    function toCamera(ctx) {
        ctx.translate(mainCanvas.width / 2, mainCanvas.height / 2);
        scaleForth(ctx);
        ctx.translate(-camera.x, -camera.y);
    }
    function scaleForth(ctx) {
        ctx.scale(camera.z, camera.z);
    }
    function scaleBack(ctx) {
        ctx.scale(camera.zScale, camera.zScale);
    }
    function fromCamera(ctx) {
        ctx.translate(camera.x, camera.y);
        scaleBack(ctx);
        ctx.translate(-mainCanvas.width / 2, -mainCanvas.height / 2);
    }
    function drawChat() {
        if (!chat.messages.length && !chat.currentMessage && settings.hideChat) return;
    
        let canvas = chat.canvas,
            ctx = canvas.getContext("2d"),
            latestMessages = chat.messages.slice(-10),
            lines = [],
            len = latestMessages.length;
    
        let maxWidth = 360; // 📏 Chat box width
        let lineHeight = 22; // 📏 Height per line of text
    
        // Store chat messages with correct wrapping
        for (let i = 0; i < len; i++) {
            let namePart = latestMessages[i].name + ":";
            let messagePart = latestMessages[i].message;
    
            // Measure the name width and adjust message wrapping
            ctx.font = "bold 18px Ubuntu";
            let nameWidth = ctx.measureText(namePart).width + 10;
    
            let wrappedMessage = wrapText(ctx, messagePart, maxWidth - nameWidth - 10);
    
            // Store the name and first line of the message on the same line
            lines.push([
                { text: namePart, color: latestMessages[i].color, bold: true },
                { text: wrappedMessage.shift(), color: settings.darkTheme ? "#FFF" : "#CCC", bold: false }
            ]);
    
            // Store remaining wrapped lines
            for (let line of wrappedMessage) {
                lines.push([{ text: line, color: settings.darkTheme ? "#FFF" : "#CCC", bold: false }]);
            }
        }
    
        // 🔥 Ensure typed message is always visible
        if (typeof chat.currentMessage === "string" && chat.currentMessage.trim() !== "") {
            let nameWidth = ctx.measureText("You:").width + 10;
            let wrappedInput = wrapText(ctx, chat.currentMessage, maxWidth - nameWidth - 10);
    
            lines.push([
                { text: "You:", color: "#00F", bold: true },
                { text: wrappedInput.shift(), color: settings.darkTheme ? "#FFF" : "#CCC", bold: false }
            ]);
    
            for (let line of wrappedInput) {
                lines.push([{ text: line, color: settings.darkTheme ? "#FFF" : "#CCC", bold: false }]);
            }
        }
    
        let height = Math.max(300, lineHeight * lines.length + 20); // 📏 Adjust height dynamically
    
        // Set canvas size dynamically
        canvas.width = maxWidth;
        canvas.height = height;
    
        // 🖤 Draw rounded background
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.beginPath();
        ctx.roundRect(0, 0, maxWidth, height, 15); // ⭕ Rounded corners
        ctx.fill();
    
        // Render chat messages
        let textY = 20;
        for (let line of lines) {
            let textX = 10;
            for (let part of line) {
                ctx.font = part.bold ? "bold 18px Ubuntu" : "18px Ubuntu";
                ctx.fillStyle = part.color;
                ctx.fillText(part.text, textX, textY);
                textX += ctx.measureText(part.text).width + 5;
            }
            textY += lineHeight;
        }
    
        // ✅ Keep chat visible & prevent it from disappearing
        setTimeout(drawChat, 100);
    }
    
    // 📜 Function to wrap text properly WITH long word breaking support
    function wrapText(ctx, text, maxWidth) {
        let words = text.split(" ");
        let lines = [];
        let line = "";
    
        for (let word of words) {
            if (ctx.measureText(word).width > maxWidth) {
                // 🔥 Break long single words properly
                let brokenWord = breakLongWord(ctx, word, maxWidth);
                lines.push(line.trim());
                lines.push(...brokenWord);
                line = "";
            } else {
                let testLine = line + word + " ";
                let testWidth = ctx.measureText(testLine).width;
    
                if (testWidth > maxWidth && line !== "") {
                    lines.push(line);
                    line = word + " ";
                } else {
                    line = testLine;
                }
            }
        }
        lines.push(line.trim());
        return lines.filter(l => l); // Remove empty lines
    }
    
    // 🔥 Function to break long single words correctly
    function breakLongWord(ctx, word, maxWidth) {
        let broken = [];
        let current = "";
    
        for (let char of word) {
            current += char;
            if (ctx.measureText(current).width > maxWidth) {
                broken.push(current);
                current = "";
            }
        }
    
        if (current) broken.push(current);
        return broken;
    }
    function drawStats() {
        if (!stats.info || settings.hideStats) {
            stats.visible = 0;
            return;
        }
    
        stats.visible = 1;
    
        let canvas = stats.canvas;
        let ctx = canvas.getContext("2d");
    
        ctx.font = "14px Poppins, Ubuntu, Arial, sans-serif";
    
        // Ensure undefined values do not break the display
        stats.info.botsTotal = stats.info.botsTotal ?? 0;
        stats.info.playersDead = stats.info.playersDead ?? 0;
    
        let rows = [
            `${stats.info.name} (${stats.info.mode})`,
            `Players: ${stats.info.playersTotal} / ${stats.info.playersLimit}`,
            `Alive: ${stats.info.playersAlive}`,
            `Dead: ${stats.info.playersDead}`,
            `Spectators: ${stats.info.playersSpect}`,
            `Bots: ${stats.info.botsTotal}`,
            `Memory: ${(stats.info.update * 2.5).toFixed(1)}%`,
            `Uptime: ${prettyPrintTime(stats.info.uptime)}`
        ];
    
        // Calculate the widest text for dynamic width
        let width = rows.reduce((max, text) => Math.max(max, ctx.measureText(text).width + 20), 0);
        
        // Dynamic height based on rows
        let rowHeight = 18;
        let height = rows.length * rowHeight + 10;
    
        canvas.width = width;
        canvas.height = height;
    
        // Background with rounded corners
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, 8);
        ctx.fill();
        ctx.globalAlpha = 1;
    
        // Text styling
        ctx.fillStyle = settings.darkTheme ? "#EEE" : "#333";
        ctx.textBaseline = "top";
        ctx.font = "14px Poppins, Ubuntu, Arial, sans-serif";
    
        // Draw each row with proper spacing
        rows.forEach((text, i) => ctx.fillText(text, 10, 5 + i * rowHeight));
    }
    
    // Function to format time properly
    function prettyPrintTime(seconds) {
        seconds = Math.floor(seconds);
        if (seconds < 60) return "<1 min";
        let minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} min`;
        let hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hours`;
        let days = Math.floor(hours / 24);
        return `${days} days`;
    }
    
    function drawLeaderboard() {
        if (!leaderboard.items.length || !settings.showNames) {
            leaderboard.visible = 0;
            return;
        }
    
        leaderboard.visible = 1;
    
        let canvas = leaderboard.canvas;
        let ctx = canvas.getContext("2d");
        let len = leaderboard.items.length;
    
        // Ensure canvas is resized properly
        canvas.width = 260;
        canvas.height = leaderboard.type !== "pie" ? 70 + 28 * len : 260;
    
        // Clear previous rendering
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        // Background with rounded corners
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, 10);
        ctx.fill();
        ctx.globalAlpha = 1;
    
        // Draw Leaderboard Title
        ctx.fillStyle = "#FFF";
        ctx.font = "26px Poppins, Ubuntu, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Leaderboard", canvas.width / 2, 40);
    
        // Render Team Mode Pie Chart
        if (leaderboard.type === "pie") {
            let last = 0;
            for (let i = 0; i < len; i++) {
                ctx.fillStyle = leaderboard.teams[i];
                ctx.beginPath();
                ctx.moveTo(130, 140);
                ctx.arc(130, 140, 80, last, (last += leaderboard.items[i] * PI_2), 0);
                ctx.closePath();
                ctx.fill();
            }
        } else {
            // Draw Player List
            ctx.font = "18px Poppins, Ubuntu, Arial, sans-serif";
            ctx.textAlign = "left";
    
            for (let i = 0; i < len; i++) {
                let text, isMe = false;
                if (leaderboard.type === "text") {
                    text = leaderboard.items[i];
                } else {
                    text = leaderboard.items[i].name || "An unnamed cell";
                    isMe = leaderboard.items[i].me;
                }
    
                let reg = /\{([\w]+)\}/.exec(text);
                if (reg) text = text.replace(reg[0], "").trim();
    
                let playerColor = String($("#lbColor").val()) || "FAA";
                ctx.fillStyle = isMe ? `#${playerColor}` : "#FFF";
                ctx.font = isMe ? "bold 18px Poppins, Ubuntu, Arial, sans-serif" : "18px Poppins, Ubuntu, Arial, sans-serif";
    
                if (leaderboard.type === "ffa") text = `${i + 1}. ${text}`;
    
                ctx.fillText(text, 20, 70 + 28 * i);
            }
        }
    
        // Ensure the leaderboard canvas updates
        if (leaderboard.ctx) {
            leaderboard.ctx.clearRect(0, 0, leaderboard.canvas.width, leaderboard.canvas.height);
            leaderboard.ctx.drawImage(canvas, 0, 0);
        }
    }
    
    function drawGrid() {
        mainCtx.save();
        mainCtx.lineWidth = 1;
        mainCtx.strokeStyle = settings.darkTheme ? "#AAA" : "#000";
        mainCtx.globalAlpha = .2;
        let step = 50,
            i,
            cW = mainCanvas.width / camera.z,
            cH = mainCanvas.height / camera.z,
            startLeft = (-camera.x + cW / 2) % step,
            startTop = (-camera.y + cH / 2) % step;
        scaleForth(mainCtx);
        mainCtx.beginPath();
        for (i = startLeft; i < cW; i += step) {
            mainCtx.moveTo(i, 0);
            mainCtx.lineTo(i, cH);
        }
        for (i = startTop; i < cH; i += step) {
            mainCtx.moveTo(0, i);
            mainCtx.lineTo(cW, i);
        }
        mainCtx.closePath();
        mainCtx.stroke();
        mainCtx.restore();
    }
    function drawBorders() { 
        if (!isConnected || border.centerX !== 0 || border.centerY !== 0 || !settings.mapBorders) return;
    
        mainCtx.save();
        mainCtx.strokeStyle = 'white'; // Solid white border
        mainCtx.lineWidth = 45; // Thick border
        mainCtx.lineCap = "round";
        mainCtx.lineJoin = "round";
    
        // ❌ Removed shadow for better performance
    
        mainCtx.beginPath();
        mainCtx.moveTo(border.left, border.top);
        mainCtx.lineTo(border.right, border.top);
        mainCtx.lineTo(border.right, border.bottom);
        mainCtx.lineTo(border.left, border.bottom);
        mainCtx.closePath();
        mainCtx.stroke();
    
        mainCtx.restore();
    }
    function drawSectors() { 
    if (!isConnected || border.centerX !== 0 || border.centerY !== 0 || !settings.sectors) return;

    let x = border.left,
        y = border.top,
        letters = "ABCDE".split(""),
        cols = 5, rows = 5, // Number of columns & rows
        w = (border.right - border.left) / cols, // Sector width
        h = (border.bottom - border.top) / rows; // Sector height

    mainCtx.save();
    mainCtx.textAlign = "center";
    mainCtx.textBaseline = "middle";
    mainCtx.font = "24px Arial"; // Slightly bigger font for visibility
    mainCtx.fillStyle = "rgba(255, 255, 255, 0.95)"; // Almost fully visible white text

    // 🏷️ Draw sector labels (A1, B2, etc.) in the correct positions
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            let labelX = x + w * i + w / 2; // Center horizontally
            let labelY = y + h * j + h / 2; // Center vertically
            mainCtx.fillText(letters[j] + (i + 1), labelX, labelY);
        }
    }

    // 📏 Draw sector grid lines
    mainCtx.strokeStyle = "rgba(255, 255, 255, 0.2)"; // Softer lines
    mainCtx.lineWidth = 2;

    for (let j = 0; j <= rows; j++) {
        mainCtx.beginPath();
        mainCtx.moveTo(x, y + h * j);
        mainCtx.lineTo(x + w * cols, y + h * j);
        mainCtx.stroke();
    }

    for (let i = 0; i <= cols; i++) {
        mainCtx.beginPath();
        mainCtx.moveTo(x + w * i, y);
        mainCtx.lineTo(x + w * i, y + h * rows);
        mainCtx.stroke();
    }

    mainCtx.restore();
}



    function drawMinimap() { 
        if (!isConnected || border.centerX !== 0 || border.centerY !== 0 || !settings.showMinimap) return;
    
        mainCtx.save();
    
        // Minimap size calculations
        let width = 200 * (border.width / border.height),
            height = 200 * (border.height / border.width),
            beginX = mainCanvas.width / camera.viewMult - width - 15, // Shifted for better positioning
            beginY = mainCanvas.height / camera.viewMult - height - 15;
    
        // Draw Minimap Background with Rounded Corners
        mainCtx.fillStyle = "#000";
        mainCtx.globalAlpha = 0.5; // Increased transparency for a sleeker look
        mainCtx.beginPath();
        mainCtx.roundRect(beginX, beginY, width, height, 8); // Rounded corners
        mainCtx.fill();
        mainCtx.globalAlpha = 1;
    
        // Grid Sector Names (A1, B2, etc.)
        let sectorNames = ["ABCDE", "12345"],
            sectorWidth = width / 5,
            sectorHeight = height / 5,
            sectorNameSize = Math.min(sectorWidth, sectorHeight) / 3;
    
        mainCtx.fillStyle = settings.darkTheme ? "#AAA" : "#333"; // More contrast
        mainCtx.textBaseline = "middle";
        mainCtx.textAlign = "center";
        mainCtx.font = `${sectorNameSize}px Poppins, Arial, sans-serif`;
    
        for (let i = 0; i < 5; i++) {
            let x = sectorWidth / 2 + i * sectorWidth;
            for (let j = 0; j < 5; j++) {
                let y = sectorHeight / 2 + j * sectorHeight;
                mainCtx.fillText(`${sectorNames[0][i]}${sectorNames[1][j]}`, beginX + x, beginY + y);
            }
        }
    
        // Scale calculations for player position
        let scaleX = width / border.width,
            scaleY = height / border.height,
            halfWidth = border.width / 2,
            halfHeight = border.height / 2,
            posX = beginX + (camera.x + halfWidth) * scaleX,
            posY = beginY + (camera.y + halfHeight) * scaleY;
    
        // Draw Player Dots on Minimap
        mainCtx.beginPath();
        if (cells.mine.length) {
            for (let i = 0; i < cells.mine.length; i++) {
                let cell = cells.byId.get(cells.mine[i]);
                if (cell) {
                    mainCtx.fillStyle = settings.showColor ? cell.color : "#FFF";
                    let x = beginX + (cell.x + halfWidth) * scaleX,
                        y = beginY + (cell.y + halfHeight) * scaleY;
                    mainCtx.beginPath();
                    mainCtx.arc(x, y, Math.max(cell.s * scaleX, 3), 0, PI_2); // Ensures a minimum size
                    mainCtx.fill();
                    mainCtx.strokeStyle = "#000";
                    mainCtx.lineWidth = 1.5;
                    mainCtx.stroke();
                }
            }
        } else {
            mainCtx.fillStyle = "#FFF";
            mainCtx.arc(posX, posY, 5, 0, PI_2);
        }
        mainCtx.fill();
    
        // Display Player Name on Minimap
        let cell = cells.byId.get(cells.mine.find(id => cells.byId.has(id)));
        if (cell) {
            mainCtx.fillStyle = settings.darkTheme ? "#FFF" : "#222";
            mainCtx.font = `${sectorNameSize}px Ubuntu`;
            mainCtx.fillText(cell.name, posX, posY - 10 - sectorNameSize / 2);
        }
    
        mainCtx.restore();
    }
    function drawGame() {
        stats.framesPerSecond += (1000 / Math.max(Date.now() - syncAppStamp, 1) - stats.framesPerSecond) / 10;
        syncAppStamp = Date.now();
        let drawList = cells.list.slice(0).sort(cellSort);
        for (let i = 0; i < drawList.length; i++) drawList[i].update(syncAppStamp);
        cameraUpdate();
        if (settings.jellyPhysics)
            for (let i = 0; i < drawList.length; i++) {
                let cell = drawList[i];
                cell.updateNumPoints();
                cell.movePoints();
            }
        mainCtx.save();
        mainCtx.fillStyle = settings.darkTheme ? "#111" : "#F2FBFF";
        mainCtx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
        if (!settings.hideGrid) drawGrid();
        toCamera(mainCtx);
        drawBorders();
        drawSectors();
        for (let i = 0; i < drawList.length; i++) drawList[i].draw(mainCtx);
        fromCamera(mainCtx);
        mainCtx.scale(camera.viewMult, camera.viewMult);
        let height = 2;
        mainCtx.fillStyle = settings.darkTheme ? "#FFF" : "#000";
        mainCtx.textBaseline = "top";
        let pos;
        if (!isNaN(stats.score)) {
            mainCtx.font = "30px Ubuntu";
            if (!settings.showPos || !isConnected) pos = "";
            else pos = `| Position: (${~~camera.x}, ${~~camera.y})`;
            mainCtx.fillText(`Score: ${stats.score} ${pos}`, 2, height);
            height += 30;
        } else {
            mainCtx.font = "30px Ubuntu";
            if (!settings.showPos || !isConnected) pos = "";
            else {
                pos = `Position: (${~~camera.x}, ${~~camera.y})`;
                mainCtx.fillText(`${pos}`, 2, height);
                height += 30;
            }
        }
        mainCtx.font = "20px Ubuntu";
        let gameStatsText = `${~~stats.framesPerSecond} FPS`;
        if (!isNaN(stats.latency)) gameStatsText += ` | ${stats.latency}ms ping`;
        mainCtx.fillText(gameStatsText, 2, height);
        height += 24;
        if (stats.visible) mainCtx.drawImage(stats.canvas, 2, height);
        if (leaderboard.visible) mainCtx.drawImage(leaderboard.canvas, mainCanvas.width / camera.viewMult - 10 - leaderboard.canvas.width, 10);
        if (!settings.hideChat && (isTyping || 1)) {
            mainCtx.globalAlpha = isTyping ? 1 : Math.max(1000 - syncAppStamp + chat.waitUntil, 0) / 1000;
            mainCtx.drawImage(chat.canvas, 10 / camera.viewMult, (mainCanvas.height - 55) / camera.viewMult - chat.canvas.height);
            mainCtx.globalAlpha = 1;
        }
        drawMinimap();
        mainCtx.restore();
        cacheCleanup();
        wHandle.requestAnimationFrame(drawGame);
    }
    function cellSort(a, b) {
        return a.s === b.s ? a.id - b.id : a.s - b.s;
    }
    function cameraUpdate() {
        let myCells = [];
        for (let i = 0; i < cells.mine.length; i++) {
            let cell = cells.byId.get(cells.mine[i]);
            if (cell) myCells.push(cell);
        }
        if (myCells.length > 0) {
            let x = 0,
                y = 0,
                s = 0,
                score = 0,
                len = myCells.length;
            for (let i = 0; i < len; i++) {
                let cell = myCells[i];
                score += ~~(cell.ns * cell.ns / 100);
                x += cell.x;
                y += cell.y;
                s += cell.s;
            }
            target.x = x / len;
            target.y = y / len;
            target.z = Math.pow(Math.min(64 / s, 1), .4);
            camera.x = (target.x + camera.x) / 2;
            camera.y = (target.y + camera.y) / 2;
            stats.score = score;
            stats.maxScore = Math.max(stats.maxScore, score);
        } else {
            stats.score = NaN;
            stats.maxScore = 0;
            camera.x += (target.x - camera.x) / 20;
            camera.y += (target.y - camera.y) / 20;
        }
        camera.z += (target.z * camera.viewMult * mouse.z - camera.z) / 9;
        camera.zScale = 1 / camera.z;
    }
    class Cell {
        constructor(id, x, y, s, name, color, skin, flags) {
            this.destroyed = 0;
            this.diedBy = 0;
            this.nameSize = 0;
            this.drawNameSize = 0;
            this.updated = null;
            this.dead = null; // timestamps
            this.id = id;
            this.x = this.nx = this.ox = x;
            this.y = this.ny = this.oy = y;
            this.s = this.ns = this.os = s;
            this.setColor(color);
            this.setName(name);
            this.setSkin(skin);
            this.jagged = flags & 0x01 || flags & 0x10;
            this.ejected = !!(flags & 0x20);
            this.food = !!(flags & 0x80); // For my server
            this.born = syncUpdStamp;
            this.points = [];
            this.pointsVel = [];
        }
        destroy(killerId) {
            cells.byId.delete(this.id);
            if (cells.mine.remove(this.id) && !cells.mine.length) showOverlay();
            this.destroyed = 1;
            this.dead = syncUpdStamp;
            if (killerId && !this.diedBy) this.diedBy = killerId;
        }
        update(relativeTime) {
            let dt = (relativeTime - this.updated) / 70,
                prevFrameSize = this.s,
                diedBy;
            dt = Math.max(Math.min(dt, 1), 0);
            if (this.destroyed && Date.now() > this.dead + 200) cells.list.remove(this);
            else if (this.diedBy && (diedBy = cells.byId.get(this.diedBy))) {
                this.nx = diedBy.x;
                this.ny = diedBy.y;
            }
            this.x = this.ox + (this.nx - this.ox) * dt;
            this.y = this.oy + (this.ny - this.oy) * dt;
            this.s = this.os + (this.ns - this.os) * dt;
            this.nameSize = ~~(~~(Math.max(~~(.3 * this.ns), 24)) / 3) * 3;
            this.drawNameSize = ~~(~~(Math.max(~~(.3 * this.s), 24)) / 3) * 3;
            if (settings.jellyPhysics && this.points.length) {
                let ratio = this.s / prevFrameSize;
                if (this.ns != this.os && ratio != 1)
                    for (let i = 0; i < this.points.length; i++) this.points[i].rl *= ratio;
            }
        }
        updateNumPoints() {
            let numPoints = Math.min(Math.max(this.s * camera.z | 0, CELL_POINTS_MIN), CELL_POINTS_MAX);
            if (this.jagged) numPoints = Math.floor(this.s);
            while (this.points.length > numPoints) {
                let i = Math.random() * this.points.length | 0;
                this.points.splice(i, 1);
                this.pointsVel.splice(i, 1);
            }
            if (this.points.length === 0 && numPoints !== 0) {
                this.points.push({
                    x: this.x,
                    y: this.y,
                    rl: this.s,
                    parent: this,
                });
                this.pointsVel.push(Math.random() - .5);
            }
            while (this.points.length < numPoints) {
                let i = Math.random() * this.points.length | 0,
                    point = this.points[i],
                    vel = this.pointsVel[i];
                this.points.splice(i, 0, {
                    x: point.x,
                    y: point.y,
                    rl: point.rl,
                    parent: this
                });
                this.pointsVel.splice(i, 0, vel);
            }
        }
        movePoints() {
            let pointsVel = this.pointsVel.slice();
            for (let i = 0; i < this.points.length; ++i) {
                let prevVel = pointsVel[(i - 1 + this.points.length) % this.points.length],
                    nextVel = pointsVel[(i + 1) % this.points.length],
                    newVel = Math.max(Math.min((this.pointsVel[i] + Math.random() - .5) * .7, 10), -10);
                this.pointsVel[i] = (prevVel + nextVel + 8 * newVel) / 10;
            }
            for (let i = 0; i < this.points.length; ++i) {
                let curP = this.points[i],
                    prevRl = this.points[(i - 1 + this.points.length) % this.points.length].rl,
                    nextRl = this.points[(i + 1) % this.points.length].rl,
                    curRl = curP.rl,
                    affected = false;
                if (!affected && (curP.x < border.left || curP.y < border.top || curP.x > border.right || curP.y > border.bottom)) affected = true;
                if (affected) this.pointsVel[i] = Math.min(this.pointsVel[i], 0) - 1;
                curRl += this.pointsVel[i];
                curRl = Math.max(curRl, 0);
                curRl = (9 * curRl + this.s) / 10;
                curP.rl = (prevRl + nextRl + 8 * curRl) / 10;
                let angle = 2 * Math.PI * i / this.points.length,
                    rl = curP.rl;
                if (this.jagged && i % 2 === 0) rl += 5;
                curP.x = this.x + Math.cos(angle) * rl;
                curP.y = this.y + Math.sin(angle) * rl;
            }
        }
        setName(value) {
            let nameSkin = /\{([\w\W]+)\}/.exec(value);
            if (this.skin == null && nameSkin != null) {
                this.name = value.replace(nameSkin[0], "").trim();
                this.setSkin(nameSkin[1]);
            } else this.name = value;
        }
        setSkin(value) {
            this.skin = value || this.skin;
            if (this.skin) {
                if (!loadedSkins[this.skin]) {
                    loadedSkins[this.skin] = new Image();
                    loadedSkins[this.skin].src = this.skin;
                }
            }
        }
        setColor(value) {
            if (!value) return log.warn("Returned no color!");
            this.color = value;
            this.sColor = darkenColor(value);
        }
        draw(ctx) {
            ctx.save();
            this.drawShape(ctx);
            this.drawText(ctx);
            ctx.restore();
        }
        drawShape(ctx) {
            if (settings.hideFood && this.food) return;
            ctx.fillStyle = settings.showColor ? this.color : Cell.prototype.color;
            let color = String($("#cellBorderColor").val());
            ctx.strokeStyle = color.length === 3 || color.length === 6 ? "#" + color : settings.showColor ? this.sColor : Cell.prototype.sColor;
            ctx.lineWidth = this.jagged ? 12 : Math.max(~~(this.s / 50), 10);
            let showCellBorder = settings.cellBorders && !this.food && !this.ejected && 20 < this.s;
            if (showCellBorder) this.s -= ctx.lineWidth / 2 - 2;
            ctx.beginPath();
            if (this.jagged) ctx.lineJoin = "miter";
            if (settings.jellyPhysics && this.points.length) {
                let point = this.points[0];
                ctx.moveTo(point.x, point.y);
                for (let i = 0; i < this.points.length; i++) ctx.lineTo(this.points[i].x, this.points[i].y);
            } else if (this.jagged) {
                let points = Math.floor(this.s),
                    increment = PI_2 / points;
                ctx.moveTo(this.x, this.y + this.s + 3);
                for (let i = 1; i < points; i++) {
                    let angle = i * increment,
                        dist = this.s - 3 + (i % 2 === 0) * 6;
                    ctx.lineTo(this.x + dist * Math.sin(angle), this.y + dist * Math.cos(angle));
                }
                ctx.lineTo(this.x, this.y + this.s + 3);
            } else ctx.arc(this.x, this.y, this.s, 0, PI_2, false);
            ctx.closePath();
            if (settings.transparency) ctx.globalAlpha = .75;
            else if (this.destroyed) ctx.globalAlpha = Math.max(200 - Date.now() + this.dead, 0) / 100;
            else ctx.globalAlpha = Math.min(Date.now() - this.born, 200) / 100;
            if (showCellBorder) ctx.stroke();
            ctx.fill();
            if (settings.showSkins && this.skin) {
                let skin = loadedSkins[this.skin];
                if (skin && skin.complete && skin.width && skin.height) {
                    ctx.save();
                    ctx.clip();
                    scaleBack(ctx);
                    let sScaled = this.s * camera.z;
                    if (settings.jellyPhysics) sScaled += 3;
                    ctx.drawImage(skin, this.x * camera.z - sScaled, this.y * camera.z - sScaled, sScaled *= 2, sScaled);
                    scaleForth(ctx);
                    ctx.restore();
                }
            }
            if (showCellBorder) this.s += ctx.lineWidth / 2 - 2;
        }
        drawText(ctx) {
            if (this.s < 20 || this.jagged) return;
            if (settings.showMass && (cells.mine.indexOf(this.id) !== -1 || !cells.mine.length) && !this.food/* && !this.ejected*/) {
                let mass = (~~(this.s * this.s / 100)).toString();
                if (this.name && settings.showNames) {
                    drawText(ctx, 0, this.x, this.y, this.nameSize, this.drawNameSize, this.name);
                    let y = this.y + Math.max(this.s / 4.5, this.nameSize / 1.5);
                    drawText(ctx, 1, this.x, y, this.nameSize / 2, this.drawNameSize / 2, mass);
                } else drawText(ctx, 1, this.x, this.y, this.nameSize / 2, this.drawNameSize / 2, mass);
            } else if (this.name && settings.showNames) drawText(ctx, 0, this.x, this.y, this.nameSize, this.drawNameSize, this.name);
        }
    }
    // 2-var draw-stay cache
    let cachedNames = {},
        cachedMass  = {};
    function cacheCleanup() {
        for (let i in cachedNames) {
            for (let j in cachedNames[i])
                if (syncAppStamp - cachedNames[i][j].accessTime >= 5000) delete cachedNames[i][j];
            if (Object.keys(cachedNames[i]).length === 0) delete cachedNames[i];
        }
        for (let i in cachedMass)
            if (syncAppStamp - cachedMass[i].accessTime >= 5000) delete cachedMass[i];
    }
    function drawTextOnto(canvas, ctx, text, size) {
        ctx.font = `${size}px 'Hind Madurai', sans-serif`; // Updated to Hind Madurai
        ctx.lineWidth = settings.showTextOutline ? Math.max(~~(size / 10), 2) : 2;
        canvas.width = ctx.measureText(text).width + 2 * ctx.lineWidth;
        canvas.height = 4 * size;
        ctx.font = `${size}px 'Hind Madurai', sans-serif`; // Updated again
        ctx.lineWidth = settings.showTextOutline ? Math.max(~~(size / 10), 2) : 2;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        
        let string = String($("#nameColor").val());
        ctx.fillStyle = "#" + (!string ? "FFF" : string);
        ctx.strokeStyle = "#000";
        ctx.translate(canvas.width / 2, 2 * size);
        
        (ctx.lineWidth !== 1) && ctx.strokeText(text, 0, 0);
        ctx.fillText(text, 0, 0);
    }    
    function drawRaw(ctx, x, y, text, size) {
        ctx.font = `${size}px Ubuntu`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.lineWidth = settings.showTextOutline ? Math.max(~~(size / 10), 2) : 2;
        ctx.fillStyle = "#FFF";
        ctx.strokeStyle = "#000";
        if (ctx.lineWidth !== 1) ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        ctx.restore();
    }
    function newNameCache(value, size) {
        let canvas = document.createElement("canvas"),
            ctx = canvas.getContext("2d");
        drawTextOnto(canvas, ctx, value, size);
        cachedNames[value] = cachedNames[value] || {};
        cachedNames[value][size] = {
            width: canvas.width,
            height: canvas.height,
            canvas: canvas,
            value: value,
            size: size,
            accessTime: syncAppStamp
        };
        return cachedNames[value][size];
    }
    function newMassCache(size) {
        let canvases = {
            "0": {}, "1": {}, "2": {}, "3": {}, "4": {},
            "5": {}, "6": {}, "7": {}, "8": {}, "9": {}
        };
        for (let value in canvases) {
            let canvas = canvases[value].canvas = document.createElement("canvas"),
                ctx = canvas.getContext("2d");
            drawTextOnto(canvas, ctx, value, size);
            canvases[value].canvas = canvas;
            canvases[value].width = canvas.width;
            canvases[value].height = canvas.height;
        }
        cachedMass[size] = {
            canvases: canvases,
            size: size,
            lineWidth: settings.showTextOutline ? Math.max(~~(size / 10), 2) : 2,
            accessTime: syncAppStamp
        };
        return cachedMass[size];
    }
    function toleranceTest(a, b, tolerance) {
        return (a - tolerance) <= b && b <= (a + tolerance);
    }
    function getNameCache(value, size) {
        if (!cachedNames[value]) return newNameCache(value, size);
        let sizes = Object.keys(cachedNames[value]);
        for (let i = 0, l = sizes.length; i < l; i++)
            if (toleranceTest(size, sizes[i], size / 4)) return cachedNames[value][sizes[i]];
        return newNameCache(value, size);
    }
    function getMassCache(size) {
        let sizes = Object.keys(cachedMass);
        for (let i = 0, l = sizes.length; i < l; i++)
            if (toleranceTest(size, sizes[i], size / 4)) return cachedMass[sizes[i]];
        return newMassCache(size);
    }
    function drawText(ctx, isMass, x, y, size, drawSize, value) {
        ctx.save();
        if (size > 500) return drawRaw(ctx, x, y, value, drawSize);
        ctx.imageSmoothingQuality = "high";
        if (isMass) {
            let cache = getMassCache(size);
            cache.accessTime = syncAppStamp;
            let canvases = cache.canvases,
                correctionScale = drawSize / cache.size,
                width = 0; // Calculate width
            for (let i = 0; i < value.length; i++) width += canvases[value[i]].width - 2 * cache.lineWidth;
            ctx.scale(correctionScale, correctionScale);
            x /= correctionScale;
            y /= correctionScale;
            x -= width / 2;
            for (let i = 0; i < value.length; i++) {
                let item = canvases[value[i]];
                ctx.drawImage(item.canvas, x, y - item.height / 2);
                x += item.width - 2 * cache.lineWidth;
            }
        } else {
            let cache = getNameCache(value, size);
            cache.accessTime = syncAppStamp;
            let canvas = cache.canvas,
                correctionScale = drawSize / cache.size;
            ctx.scale(correctionScale, correctionScale);
            x /= correctionScale;
            y /= correctionScale;
            ctx.drawImage(canvas, x - canvas.width / 2, y - canvas.height / 2);
        }
        ctx.restore();
    }
    function init() {
        mainCanvas = document.getElementById("canvas");
        mainCtx = mainCanvas.getContext("2d");
        chatBox = document.getElementById("chat_textbox");
        soundsVolume = document.getElementById("soundsVolume");
        mainCanvas.focus();
        function handleScroll(event) {
            mouse.z *= Math.pow(.95, event.wheelDelta / -120 || event.detail || 0);
            if (!settings.infiniteZoom && mouse.z < 1) mouse.z = 1;
            if (mouse.z > 4 / mouse.z) mouse.z = 4 / mouse.z;
        }
        if (/firefox/i.test(navigator.userAgent)) document.addEventListener("DOMMouseScroll", handleScroll, 0);
        else document.body.onmousewheel = handleScroll;
        wHandle.onkeydown = function(event) {
            switch (event.keyCode) {
                case 13: // Enter
                    if (overlayShown) break;
                    if (settings.hideChat) break;
                    if (isTyping) {
                        chatBox.blur();
                        let chatText = chatBox.value;
                        if (chatText.length > 0) sendChat(chatText);
                        chatBox.value = "";
                    } else chatBox.focus();
                    break;
                case 32: // Space
                    if (isTyping || overlayShown || pressed.space) break;
                    wsSend(UINT8[17]);
                    pressed.space = 1;
                    break;
                case 87: // W
                    if (isTyping || overlayShown) break;
                    wsSend(UINT8[21]);
                    pressed.w = 1;
                    break;
                case 81: // Q
                    if (isTyping || overlayShown || pressed.q) break;
                    sendMultiSplit(2);
                    break;
                case 51: // Key "3" for Triple Split
                    sendMultiSplit(3);
                    break;
                    sendMultiSplit(2);
                    break;
                case 51: // Key "3" for Triple Split
                    sendMultiSplit(3);
                    break;
                case 52: // Key "4" for 16x Split
                    sendMultiSplit(16);
                    break;
                case 53: // Key "5" for 32x Split
                    sendMultiSplit(32);
                    break;
                case 54: // Key "6" for 64x Split
                    sendMultiSplit(64);
                    break;
                case 81: // Key "Q" for Diagonal Split
                    diagonalSplit();
                    break;
                case 69: // E
                    if (isTyping || overlayShown) break;
                    wsSend(UINT8[22]);
                    pressed.e = 1;
                    break;
                case 82: // R
                    if (isTyping || overlayShown) break;
                    wsSend(UINT8[23]);
                    pressed.r = 1;
                    break;
                case 84: // T
                    if (isTyping || overlayShown || pressed.t) break;
                    wsSend(UINT8[24]);
                    pressed.t = 1;
                    break;
                case 80: // P
                    if (isTyping || overlayShown || pressed.p) break;
                    wsSend(UINT8[25]);
                    pressed.p = 1;
                    break;
                case 79: // O
                    if (isTyping || overlayShown || pressed.o) break;
                    wsSend(UINT8[26]);
                    pressed.o = 1;
                    break;
                case 77: // M
                    if (isTyping || overlayShown || pressed.m) break;
                    wsSend(UINT8[27]);
                    pressed.m = 1;
                    break;
                case 73: // I
                    if (isTyping || overlayShown || pressed.i) break;
                    wsSend(UINT8[28]);
                    pressed.i = 1;
                    break;
                case 89: // Y
                    if (isTyping || overlayShown) break;
                    wsSend(UINT8[30]);
                    pressed.y = 1;
                    break;
                case 85: // U
                    if (isTyping || overlayShown) break;
                    wsSend(UINT8[31]);
                    pressed.u = 1;
                    break;
                case 75: // K
                    if (isTyping || overlayShown || pressed.k) break;
                    wsSend(UINT8[29]);
                    pressed.k = 1;
                    break;
                case 76: // L
                    if (isTyping || overlayShown || pressed.l) break;
                    wsSend(UINT8[33]);
                    pressed.l = 1;
                    break;
                case 72: // H
                    if (isTyping || overlayShown || pressed.h) break;
                    wsSend(UINT8[34]);
                    pressed.h = 1;
                    break;
                case 90: // Z
                    if (isTyping || overlayShown) break;
                    wsSend(UINT8[35]);
                    pressed.z = 1;
                    break;
                case 88: // X
                    if (isTyping || overlayShown || pressed.x) break;
                    wsSend(UINT8[36]);
                    pressed.x = 1;
                    break;
                case 83: // S
                    if (isTyping || overlayShown) break;
                    wsSend(UINT8[37]);
                    pressed.s = 1;
                    break;
                case 67: // C
                    if (isTyping || overlayShown || pressed.c) break;
                    wsSend(UINT8[38]);
                    pressed.c = 1;
                    break;
                case 71: // J
                    if (isTyping || overlayShown) break;
                    wsSend(UINT8[39]);
                    pressed.j = 1;
                    break;
                case 74: // G
                    if (isTyping || overlayShown) break;
                    wsSend(UINT8[40]);
                    pressed.g = 1;
                    break;
                case 66: // B
                    if (isTyping || overlayShown || pressed.b) break;
                    wsSend(UINT8[41]);
                    pressed.b = 1;
                    break;
                case 86: // V
                    if (isTyping || overlayShown) break;
                    wsSend(UINT8[42]);
                    pressed.v = 1;
                    break;
                case 78: // N
                    if (isTyping || overlayShown) break;
                    wsSend(UINT8[43]);
                    pressed.n = 1;
                    break;
                case 27: // Esc
                    if (pressed.esc) break;
                    overlayShown ? hideOverlay() : showOverlay();
                    pressed.esc = 1;
            }
        };
        wHandle.onkeyup = function(event) {
            switch (event.keyCode) {
                case 32: // Space
                    pressed.space = 0;
                    break;
                case 87: // W
                    pressed.w = 0;
                    break;
                case 81: // Q
                    if (pressed.q) wsSend(UINT8[19]);
                    pressed.q = 0;
                    break;
                case 69: // E
                    pressed.e = 0;
                    break;
                case 82: // R
                    pressed.r = 0;
                    break;
                case 84: // T
                    pressed.t = 0;
                    break;
                case 80: // P
                    pressed.p = 0;
                    break;
                case 79: // O
                    pressed.o = 0;
                    break;
                case 77: // M
                    pressed.m = 0;
                    break;
                case 73: // I
                    pressed.i = 0;
                    break;
                case 89: // Y
                    pressed.y = 0;
                    break;
                case 85: // U
                    pressed.u = 0;
                    break;
                case 75: // K
                    pressed.k = 0;
                    break;
                case 76: // L
                    pressed.l = 0;
                    break;
                case 72: // H
                    pressed.h = 0;
                    break;
                case 90: // Z
                    pressed.z = 0;
                    break;
                case 88: // X
                    pressed.x = 0;
                    break;
                case 83: // S
                    pressed.s = 0;
                    break;
                case 67: // C
                    pressed.c = 0;
                    break;
                case 74: // G
                    pressed.g = 0;
                    break;
                case 71: // J
                    pressed.j = 0;
                    break;
                case 66: // B
                    pressed.b = 0;
                    break;
                case 86: // V
                    pressed.v = 0;
                    break;
                case 78: // N
                    pressed.n = 0;
                    break;
                case 27: // Esc
                    pressed.esc = 0;
            }
        };
        chatBox.onblur = function() {
            isTyping = 0;
            drawChat();
        };
        chatBox.onfocus = function() {
            isTyping = 1;
            drawChat();
        };
        mainCanvas.onmousemove = function(event) {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
        };
        setInterval(() => { // Send mouse update
            sendMouseMove((mouse.x - mainCanvas.width / 2) / camera.z + camera.x, (mouse.y - mainCanvas.height / 2) / camera.z + camera.y);
        }, 60);
        wHandle.onresize = function() {
            let cW = mainCanvas.width = wHandle.innerWidth,
                cH = mainCanvas.height = wHandle.innerHeight;
            camera.viewMult = Math.sqrt(Math.min(cH / 1080, cW / 1920));
        };
        wHandle.onresize();
        log.info(`Init completed in ${Date.now() - DATE}ms`);
        gameReset();
        showOverlay();
        if (settings.allowGETipSet && wHandle.location.search) {
            let div = /ip=([\w\W]+):([0-9]+)/.exec(wHandle.location.search.slice(1));
            if (div) wsInit(`${div[1]}:${div[2]}`);
        }
        window.requestAnimationFrame(drawGame);

        function sendMultiSplit(times) {
            for (let i = 0; i < times; i++) {
                wsSend(UINT8[17]); // Send split command
            }
        }

        function diagonalSplit() {
            let angle = Math.atan2(mouse.y - mainCanvas.height / 2, mouse.x - mainCanvas.width / 2);
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    wsSend(UINT8[17]); // Send split command
                    sendMouseMove(
                        (mouse.x - mainCanvas.width / 2) / camera.z + camera.x + Math.cos(angle) * 100,
                        (mouse.y - mainCanvas.height / 2) / camera.z + camera.y + Math.sin(angle) * 100
                    );
                }, i * 50); // Delay each split slightly for diagonal effect
            }
        }

        function updateActiveSkin(skinUrl) {
            const activeSkinDiv = document.getElementById('active_skin');
            activeSkinDiv.style.backgroundImage = `url(${skinUrl})`;
        }

        // Add event listener to the skin URL input
        document.getElementById('skin_url').addEventListener('input', function() {
            const skinUrl = this.value;
            updateActiveSkin(skinUrl);
        });

        // Example function to set the active skin (you can replace this with your actual logic)
        function setActiveSkin(skinUrl) {
            updateActiveSkin(skinUrl);
        }

        // Call setActiveSkin with the initial skin URL (replace with the actual initial skin URL if needed)
        setActiveSkin('https://example.com/skins/doge.png');

        function updateActiveSkin(skinName) {
            const activeSkinDiv = document.getElementById('active_skin');
            activeSkinDiv.style.backgroundImage = `url(${skinName})`;
        }

        // Example function to set the active skin (you can replace this with your actual logic)
        function setActiveSkin(skinName) {
            updateActiveSkin(skinName);
        }

        // Call setActiveSkin with the initial skin (replace 'doge' with the actual initial skin name)
        setActiveSkin('doge');

        wHandle.play = function(arg) {
            let skinUrl = document.getElementById('skin_url').value; // Get the skin URL from the input
            sendPlay(arg, skinUrl); // Pass the skin URL to the sendPlay function
            hideOverlay();
        };
    }
    wHandle.setServer = function(arg) {
        if (WS_URL === arg) return;
        wsInit(arg);
    };
    wHandle.setSkins = function(arg) {
        settings.showSkins = arg;
    };
    wHandle.setNames = function(arg) {
        settings.showNames = arg;
        drawLeaderboard();
    };
    wHandle.setColors = function(arg) {
        settings.showColor = !arg;
    };
    wHandle.setChatHide = function(arg) {
        settings.hideChat = arg;
        settings.hideChat ? wjQuery('#chat_textbox').hide() : wjQuery('#chat_textbox').show();
    };
    wHandle.setMinimap = function(arg) {
        settings.showMinimap = !arg;
    };
    wHandle.setGrid = function(arg) {
        settings.hideGrid = arg;
    };
    wHandle.setFood = function(arg) {
        settings.hideFood = arg;
    };
    wHandle.setStats = function(arg) {
        settings.hideStats = arg;
    };
    wHandle.setShowMass = function(arg) {
        settings.showMass = arg;
    };
    wHandle.setDarkTheme = function(arg) {
        settings.darkTheme = arg;
        drawStats();
    };
    wHandle.setCellBorder = function(arg) {
        settings.cellBorders = arg;
    };
    wHandle.setJelly = function(arg) {
        settings.jellyPhysics = arg;
    };
    wHandle.setTextOutline = function(arg) {
        settings.showTextOutline = arg;
    };
    wHandle.setZoom = function(arg) {
        settings.infiniteZoom = arg;
    };
    wHandle.setTransparency = function(arg) {
        settings.transparency = arg;
    };
    wHandle.setMapBorders = function(arg) {
        settings.mapBorders = arg;
    };
    wHandle.setSectors = function(arg) {
        settings.sectors = arg;
    };
    wHandle.setCellPos = function(arg) {
        settings.showPos = arg;
    };
    wHandle.spectate = function() {
        wsSend(UINT8[1]);
        stats.maxScore = 0;
        hideOverlay();
    };
    wHandle.openSkinsList = function() {
        if (wjQuery("#inPageModalTitle").text() === "Skins") return;
        wjQuery.get("include/gallery.php").then(function(data) {
            wjQuery("#inPageModalTitle").text("Skins");
            wjQuery("#inPageModalBody").html(data);
        });
    wHandle.onload = init;
    };
    wHandle.play = function(arg) {
        let skinUrl = document.getElementById('skin_url').value; // Get the skin URL from the input
        sendPlay(arg, skinUrl); // Pass the skin URL to the sendPlay function
        hideOverlay();
    };
    wHandle.onload = init;

})(window, window.jQuery);
