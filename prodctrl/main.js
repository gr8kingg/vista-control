const { app, BrowserWindow } = require('electron')
const _ = require('lodash');
const WebSocket = require('ws');
const vistaIo = require('socket.io-client')('http://localhost:3000');




var mainWindow;
function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')
}

app.on('ready', () => {
  createWindow();
})

function sendMsg(msg) {
  mainWindow.webContents.send('log', msg);
}



vistaIo.on('error', (err) => {
  sendMsg('error with connection to vista relay ' + err);
})

vistaIo.on('connect', () => {
  sendMsg('connected to remote');
  //vistaIo.emit('vista', 'jw2q2');
})

var propresenterWs;
var initPPWebSocket = () => {
  propresenterWs = new WebSocket('ws://localhost:58109/stagedisplay');
  propresenterWs.on('error', (err) => {
    sendMsg('error connecting to propresenter ' + err);
  });

  propresenterWs.on('close', () => {
    sendMsg('closed');
    setTimeout(initPPWebSocket, 1000);
  });

  propresenterWs.on('open', () => {
    sendMsg('connected to propresenter');
    propresenterWs.send(JSON.stringify({"pwd":"password","ptl":610,"acn":"ath"}));

  })

  propresenterWs.on('message', (message) => {
    message = JSON.parse(message);
    sendMsg("got message " + JSON.stringify(message));
    switch(message.acn)
        {
            case "ath":
                if (message.ath)
                {
                  sendMsg("Connected to ProPresenter.");
            
                }
                else
                {
                  sendMsg("Error connecting to ProPresenter. Invalid pasword. ");
                }
                break;
            case "sys":
                sendMsg("sys: " + JSON.stringify(message));
                break;
            case "tmr":
                sendMsg("tmr: " + JSON.stringify(message));
                //add support for timers/clocks
                break;
            case "vid":
                sendMsg("vid: " + JSON.stringify(message));
                //add support for video countdowns
                break;
            case "fv":
                let currentSlide = message.ary[0].txt;
                let currentSlideNotes = message.ary[2].txt;
                let nextSlide = message.ary[1].txt;
                let nextSlide_notes = message.ary[3].txt;
                              
                sendMsg("slide notes " + currentSlideNotes);
                
                var cmdArr = _.split(currentSlideNotes, '\n');
                
                cmdArr.forEach((cmd) => {
                  
                  if(_.startsWith(_.toLower(cmd), "v-")) {
                    
                    var vistaCmd = cmd.substring(2);
                    if(vistaIo.connected) {
                      sendMsg('emitting vista command ' + vistaCmd);
                      vistaIo.emit('vista', vistaCmd);
                    } else {
                      sendMsg('remote connection not connected, skipping cmd ' + vistaCmd);
                    }
                  }
                })
                
                break;
            default:
                console.log(message);
                break;
        }
  });
}
initPPWebSocket();



