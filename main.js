const { app, BrowserWindow, ipcMain } = require('electron');
const expressApp = require('express')();
const WebSocket = require('ws');
const _ = require('lodash');
const moment = require('moment');
const Store = require('electron-store');
const store = new Store();
const midi = require('midi');

var output = new midi.output();
output.openVirtualPort("Vista Control");

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
  setTimeout(initPPWebSocket, 500);
}

var log = (msg) => {
  msg = moment().format('x') + ' ' + msg;
  try {
    mainWindow.webContents.send('log', msg);
  } catch {
    // ignore - window may be closing
  }
};

var status = (ppconnected) => {
  mainWindow.webContents.send('ppstatus', {
    ppconnected: ppconnected
  });
};

var lastCommand = new Promise((res,rej) => {
  res();
});

ipcMain.on('loaded', (event,arg) => {
  var defaultsToSend = {
    serverPort: store.get('serverPort', 3000),
    ppEnabled: store.get('ppEnabled', true),
    ppIp: store.get('ppIp', 'localhost'),
    ppPort: store.get('ppPort','58109'),
    ppPwd: store.get('ppPwd',"password"),
  }
  mainWindow.webContents.send('loadedDefaults', defaultsToSend);
  status(propresenterWs && wsConnected);
});

ipcMain.on('testCmd', (event,arg) => {
  log('testing command ' + arg.cmd);

  playSlideNotes(arg.cmd);
})

ipcMain.on('update', (event, arg) => {
  console.log('received new update ' + JSON.stringify(arg));

  var wasProPresEnabled = store.get('ppEnabled', true);
  
  store.set(arg);

  expressServer.close();
  expressServer = expressApp.listen(store.get('serverPort', 3000), () => {
    log('App listening on port ' + store.get('serverPort', 3000));
  });
  if(propresenterWs) {
    wsConnected = false;
    propresenterWs.close();
  }
  if(!wasProPresEnabled) {
    setTimeout(initPPWebSocket, 500);
  }

});


var vistaMidi = (msg) => {
  if(msg === 'ra') {
    log('sending midi release all');
    output.sendMessage([0xF0, 0x7F, 0x01, 0x02, 0x01, 0x0A, 0xF7]);
  } else if (_.startsWith(msg,'x')) {
    // v-w2
    var cluelist = msg.substring(1);
    log('sending midi close cuelist ' + cluelist);
    var cmdToSend = [0xF0, 0x7F, 0x01, 0x02, 0x01, 0x1C];
    for (var i = 0; i < cluelist.length; i++) {
      cmdToSend.push(cluelist.charCodeAt(i));
    }
    cmdToSend.push(0xF7)
    output.sendMessage(cmdToSend);
  } else if (_.startsWith(msg,'w')) {
    // v-w2
    var cluelist = msg.substring(1);
    log('sending midi open cuelist ' + cluelist);
    var cmdToSend = [0xF0, 0x7F, 0x01, 0x02, 0x01, 0x1B];
    for (var i = 0; i < cluelist.length; i++) {
      cmdToSend.push(cluelist.charCodeAt(i));
    }
    cmdToSend.push(0xF7)
    output.sendMessage(cmdToSend);
  }else if (_.startsWith(msg,'q')) {
    var msg = msg.substring(1);
    //  v-q2w3
    var cluelistAry = msg.split('w');

    
    var cmdToSend = [0xF0, 0x7F, 0x01, 0x02, 0x01, 0x01];
    for (var i = 0; i < cluelistAry[0].length; i++) {
      cmdToSend.push(cluelistAry[0].charCodeAt(i));
    }
    if(cluelistAry.length > 1) {
      log('sending midi open cue' + cluelistAry[0] + ' cuelist ' + cluelistAry[1]);
      cmdToSend.push(0x00)
      for (var i = 0; i < cluelistAry[1].length; i++) {
        cmdToSend.push(cluelistAry[1].charCodeAt(i));
      }
    } else {
      log('sending midi open cue' + cluelistAry[0]);
    }
    cmdToSend.push(0xF7)
    output.sendMessage(cmdToSend);
  } else if (_.startsWith(msg,'k')) {
    var msg = msg.substring(1);
    //  v-k2w3
    var cluelistAry = msg.split('w');

    var cmdToSend = [0xF0, 0x7F, 0x01, 0x02, 0x01, 0x0B];
    for (var i = 0; i < cluelistAry[0].length; i++) {
      cmdToSend.push(cluelistAry[0].charCodeAt(i));
    }
    if(cluelistAry.length > 1) {
      log('sending midi release cue' + cluelistAry[0] + ' cuelist ' + cluelistAry[1]);
      cmdToSend.push(0x00)
      for (var i = 0; i < cluelistAry[1].length; i++) {
        cmdToSend.push(cluelistAry[1].charCodeAt(i));
      }
    } else {
      log('sending midi relase cue' + cluelistAry[0] );
    }
    cmdToSend.push(0xF7)
    output.sendMessage(cmdToSend);
  } else {
    log('unknown command ' + msg)
  }
}

app.on('ready', () => {
  createWindow()
});

expressApp.get('/', (req, res) => res.send('Hello World!'))

expressApp.get('/ctl', (req, res) => {
  if(req.query.cmd) {
    playSlideNotes(req.query.cmd);
  }
  res.send('ok');
})

var playSlideNotes = (notes) => {
  var cmdArr = _.split(notes, '\n');
                
  cmdArr.forEach((cmd) => {
    

    if(_.startsWith(_.toLower(cmd), "vm-")) {
      var vistaCmdToSend = cmd.substring(3);
      vistaMidi(vistaCmdToSend);
    }
    if(_.startsWith(_.toLower(cmd), "vn-")) {
      var vistaCmdToSend = cmd.substring(3);
      nextSlideNotes.push(vistaCmdToSend);
    }
    if(_.startsWith(_.toLower(cmd), "ve-")) {
      var vistaCmdToSend = cmd.substring(3).split('-', 2);
      if(vistaCmdToSend.length !== 2) {
        log('unable to parse end video cmd ' + cmd);
        return
      }
      var secondsRemaining = parseInt(vistaCmdToSend[0]);
      if(!vidEndSlideNodes[secondsRemaining]) {
        log('set new list of comands for end video at seconds: ' + secondsRemaining)
        vidEndSlideNodes[secondsRemaining] = [];
      }
      log('add cmd end video at seconds: ' + secondsRemaining)
      vidEndSlideNodes[secondsRemaining].push(vistaCmdToSend[1]);
    }
  })
}

var nextSlideNotes = [];
var vidEndSlideNodes = {}
var wsConnected = false;
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
    wsConnected = false;
    setTimeout(initPPWebSocket, 10000);
  });

  propresenterWs.on('open', () => {
    log('connected to propresenter');
    status(true);
    wsConnected = true;
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
                log("vid: " + JSON.stringify(message));
                if(!_.startsWith(message.txt, '-')) {
                  
                  var remainingSeconds
                  if(message.txt.split(":").length === 3) {
                    remainingSeconds = parseInt(moment(message.txt, 'HHmmss').diff(moment().startOf('day'), 'seconds'));
                  } else if (message.txt.split(":").length === 2) {
                    remainingSeconds = parseInt(moment("0:" + message.txt, 'HHmmss').diff(moment().startOf('day'), 'seconds'));
                  } else  {
                    remainingSeconds = parseInt(moment("0:00:" + message.txt, 'HHmmss').diff(moment().startOf('day'), 'seconds'));
                  }
                  
                  log('checking vid time at ' +remainingSeconds + JSON.stringify(vidEndSlideNodes));
                  if(vidEndSlideNodes[remainingSeconds]) {
                    log('end of video commands found; firing');
                    vidEndSlideNodes[remainingSeconds].forEach((cmd) => {
                      vistaMidi(cmd);
                    })
                  }
                }
                //add support for video countdowns
                break;
            case "fv":
                log("got message " + JSON.stringify(message));
                
                //let currentSlide = message.ary[0].txt;
                let currentSlideNotesObject = _.find(message.ary, {'acn':'csn'});

                if(!currentSlideNotesObject){
                  log('missing current slide nodes');
                  return;
                }
                let currentSlideNotes = currentSlideNotesObject.txt;
                //let nextSlide = message.ary[1].txt;
                //let nextSlideNotes = message.ary[3].txt;
                if(nextSlideNotes.length > 0)   {
                  nextSlideNotes.forEach((n) => {
                    vistaMidi(n);
                  })
                }   
                nextSlideNotes = [];
                vidEndSlideNodes = {};         
                log("slide notes " + currentSlideNotes);
                playSlideNotes(currentSlideNotes);
                
                
                break;
            default:
                console.log(message);
                break;
        }
  });
}


