After running npm install, run
./node_modules/.bin/electron-rebuild

running before building app
npm start

Build .app:

./node_modules/.bin/electron-packager ./

Setup
Start 
After starting, if vista is already runbning, you must disable/enable the midi 


| Command       | Defn           |
| ------------- |----------------| 
| vm-ra      | Release all | 
| vm-q3w2      | go to cue 3 on cuelist 2 | 
| vm-q3w2      | go to cue 3 on cuelist 2 | 
| vm-q0w2      | go to next queue on cuelist 2 |
| vm-k0w2      | release cuelist 2 |

Context 
| Command       | Defn           |
| ------------- |----------------| 
| vm-w2      | set to cuelist 2 | 
| vm-q3      | go to cue 3 on cuelist 2 | 
| vm-q0      | go to next queue on cuelist 2 |
| vm-k0      | go to next queue on cuelist 2 |
| vm-x2      | stop context cuelist 2 |

Send a midi command on the next loaded slide
| Command       | Defn           |
| ------------- |----------------| 
| vn-ra      | Release all | 
| vn-q3w2      | go to cue 3 on cuelist 2 | 
| vn-q3w2      | go to cue 3 on cuelist 2 | 
| vn-q0w2      | go to next queue on cuelist 2 |
| vn-k0w2      | release cuelist 2 |

Send a midi command before the current video ends
| Command       | Defn           |
| ------------- |----------------| 
| ve-3-ra      | Release all 3 seconds before end | 
| ve-3-q1w2      | go to cue 1 on cuelist 2 3 seconds before end | 
| ve-5-q1w2      | go to cue 1 on cuelist 2 5 seconds before end | 

add "3s before end of vid"

Sending commands from GET Rest xcall
http://<ip>:3000/ctl?cmd=<command from above>