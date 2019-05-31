const { app, BrowserWindow } = require('electron');
const appExp = require('express')();
const http = require('http').createServer(appExp);
const io = require('socket.io')(http);

const applescript = require('applescript');

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
  createWindow()
});

function sendMsg(msg) {
  mainWindow.webContents.send('log', msg);
}
var lastCommand = new Promise((res,rej) => {
  res();
});
io.on('connection', function(socket){
  sendMsg('A client connected');
  socket.on('vista', function(msg){
    sendMsg('Vista message: ' + msg);

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
            sendMsg('error sending applescript ' + err);
            res();
            return;
          }
          sendMsg('Sent');
          res();
          
        });
      });
    })
    
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
