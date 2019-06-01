const { app, BrowserWindow, ipcMain } = require('electron');
const expressApp = require('express')();
const WebSocket = require('ws');
const _ = require('lodash');
const moment = require('moment');
const Store = require('electron-store');
const store = new Store();


const applescript = require('applescript');

var mainWindow;
var expressServer;
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

  expressServer = expressApp.listen(store.get('serverPort', 3000), () => {
    log('App listening on port ' + store.get('serverPort', 3000));
  });
  initPPWebSocket();
}

var log = (msg) => {
  msg = moment().format() + ' ' + msg;
  mainWindow.webContents.send('log', msg);
};

var status = (ppconnected) => {
  mainWindow.webContents.send('status', {
    ppconnected: ppconnected
  });
};

var lastCommand = new Promise((res,rej) => {
  res();
});

ipcMain.on('update', (event, arg) => {
  console.log('received new update ' + JSON.stringify(arg));

  var wasProPresEnabled = store.get('ppEnabled', true);
  
  store.set(arg);

  expressServer.close();
  expressServer = expressApp.listen(store.get('serverPort', 3000), () => {
    log('App listening on port ' + store.get('serverPort', 3000));
  });
  if(propresenterWs) {
    propresenterWs.close();
  }
  if(!wasProPresEnabled) {
    initPPWebSocket();
  }

});

var vistaCmd = (msg) => {
  var script;
  if(msg === 'ra') {
    script = 'tell application "System Events"\ntell application "Vista" to activate\nkey code 111\nend tell';
  } else if (msg === 'play') {
    script = 'tell application "System Events"\ntell application "Vista" to activate\nkey code 49\nend tell';
  } else if (msg === 'back') {
    script = 'tell application "System Events"\ntell application "Vista" to activate\nkey code 49 using {control down}\nend tell';
  } else {
    script = 'tell application "System Events"\ntell application "Vista" to activate\nkey code 51 using {command down}\nkeystroke "' + msg + '"\nkey code 36\nend tell';
  }

  lastCommand.then(() => {
    return new Promise((res,rej) => {
      applescript.execString(script, (err, rtn) => {
        if (err) {
          log('error sending applescript ' + err);
          res();
          return;
        }
        log('Sent');
        res();
        
      });
    });
  })
}

app.on('ready', () => {
  createWindow()
});

expressApp.get('/', (req, res) => res.send('Hello World!'))

expressApp.get('/ctl', (req, res) => {
  if(req.query.cmd) {
    vistaCmd(req.query.cmd);
  }
  res.send('ok');
})

var playSlideNotes = (notes) => {
  var cmdArr = _.split(notes, '\n');
                
  cmdArr.forEach((cmd) => {
    
    if(_.startsWith(_.toLower(cmd), "v-")) {
      
      var vistaCmdToSend = cmd.substring(2);
      vistaCmd(vistaCmdToSend);
    }
  })
}

var nextSlideNotes = null;
var propresenterWs;
var initPPWebSocket = () => {
  if(!store.get('ppEnabled', true)) {
    return;
  }
  propresenterWs = new WebSocket('ws://' + store.get('ppIp', 'localhost') + ':' + store.get('ppPort','58109') + '/stagedisplay');
  propresenterWs.on('error', (err) => {
    log('error connecting to propresenter ' + err);
  });

  propresenterWs.on('close', () => {
    log('closed');
    status(false);
    setTimeout(initPPWebSocket, 10000);
  });

  propresenterWs.on('open', () => {
    log('connected to propresenter');
    status(true);
    propresenterWs.send(JSON.stringify({"pwd":store.get('ppPwd',"password"),"ptl":610,"acn":"ath"}));

  })

  propresenterWs.on('message', (message) => {
    message = JSON.parse(message);
    //log("got message " + JSON.stringify(message));
    switch(message.acn)
        {
            case "ath":
                if (message.ath)
                {
                  log("Connected to ProPresenter.");
            
                }
                else
                {
                  log("Error connecting to ProPresenter. Invalid pasword. ");
                }
                break;
            case "sys":
                //log("sys: " + JSON.stringify(message));
                break;
            case "tmr":
                //log("tmr: " + JSON.stringify(message));
                //add support for timers/clocks
                break;
            case "vid":
                //console.log("vid: " + JSON.stringify(message));
                if(!_.startsWith(message.txt, '-')) {
                  var remainingSeconds = moment(message.txt, 'HHmmss').diff(moment().startOf('day'), 'seconds');
                  var triggerOnSeconds = parseInt(store.get('ppAutoPlay', '3'));
                  if(triggerOnSeconds >= 0 && remainingSeconds === triggerOnSeconds && nextSlideNotes) {
                    playSlideNotes(nextSlideNotes);
                  }
                }
                //add support for video countdowns
                break;
            case "fv":
                log("got message " + JSON.stringify(message));
                let currentSlide = message.ary[0].txt;
                let currentSlideNotes = message.ary[2].txt;
                let nextSlide = message.ary[1].txt;
                nextSlideNotes = message.ary[3].txt;
                              
                log("slide notes " + currentSlideNotes);
                playSlideNotes(currentSlideNotes);
                
                
                break;
            default:
                console.log(message);
                break;
        }
  });
}


