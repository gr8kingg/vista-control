# Vista Control

This is an application used to control Chroma-Q Vista (formally Jands Vista) using Midi Show Control. The Commands can be sent using a REST Get call. The application can also be setup to read the commands from ProPreseneter using the Stage Display Notes.

This app sends the command using Midi Show Control on Device 1. It is meant to run on the same computer as Jands. ProPresenter can be on a remote computer.


# Building

Node.js is required. The midi library requires xcode and python installed.
Clone the repository and run
```
npm i
```

After running npm install, run
```
./node_modules/.bin/electron-rebuild
```

Running the app
```
npm start
```

Build the .app file:
```
./node_modules/.bin/electron-packager ./
```

# Setup
First start Vista Control. Then open Jands Vista. Go to File -> User Preferences ... -> Midi. Change the Midi Show Control setting to 1. Place a checkbox next to "Vista Control" under External Midi Ports. Click Apply and Ok.
Make sure Tools -> Midi Show Control is checked.

If Vista Control is restarted while Vista is still running, you need to go back into the User Preferences -> Midi and uncheck and recheck "Vista Control" and click Apply.

To Connect to ProPresenter, Open ProPresenter, and select Preferences -> Network. Enable the "Network" box and set the port to 58109. Also check the "Enable Stage Display App". Set the password to "password".

Open or create Cuelist with id 1. Add 3 cues in this cuelist in Vista. Set . Edit a slide in ProPresenter and set the Stage Display notes to "vm-q2w1". Select the slide and cue 2 of cuelist 1 should fire.

Run the following to call the REST Api with the same comnand to fire cue 2 of cuelist 1
```
curl http://localhost:3000/ctl?cmd=vm-q2w1
```

# Commands
## Basic commands
Start with 'vm-' and then the command to send

'ra' is release all<br/>
'q{cue id}w{cuelist id}' go cue in cuelist <br/>
'q0w{cuelist id}' go to next cue in cuelist<br/>
'k0q{cuelist id}' release cluelist 

| Command      | Defn           |
| ------------ |----------------| 
| vm-ra        | Release all | 
| vm-q3w2      | go to cue 3 on cuelist 2 | 
| vm-q3w2      | go to cue 3 on cuelist 2 | 
| vm-q0w2      | go to next queue on cuelist 2 |
| vm-k0w2      | release cuelist 2 |

## Context based commands
You can 'add' more than 1 cuelists to the current context. 

| Command    | Defn           |
| ---------- |----------------| 
| vm-w2      | set/add context to cuelist 2 | 
| vm-q3      | go to cue 3 on cuelist 2 | 
| vm-q0      | go to next queue on cuelist 2 |
| vm-k0      | go to next queue on cuelist 2 |
| vm-x2      | stop context cuelist 2 |

## Queue up a midi command to be played on the next slide change
Change the prefix to 'vn-' 

| Command      | Defn           |
| ------------ |----------------| 
| vn-ra        | Release all | 
| vn-q3w2      | go to cue 3 on cuelist 2 | 
| vn-q3w2      | go to cue 3 on cuelist 2 | 
| vn-q0w2      | go to next queue on cuelist 2 |
| vn-k0w2      | release cuelist 2 |

If you wish to have a slide hold off on playing the queued up next slide commands, add 'vm-h' to the slide
If you wish to have a slide clear the queued up next slide commands, add 'vm-e' to the slide


## Send a midi command before the current video ends
Change the prefix to 've-' <br/>
then add '{seconds}-' where seconds is the number of seconds before the video ends<br/>
then add the command

| Command       | Defn           |
| ------------- |----------------| 
| ve-3-ra       | Release all 3 seconds before end | 
| ve-3-q1w2     | go to cue 1 on cuelist 2, 3 seconds before end | 
| ve-5-q1w2     | go to cue 1 on cuelist 2, 5 seconds before end | 

# Sending commands from GET Rest call
Use the foloowing GET rest call
```
http://<ip>:3000/ctl?cmd=<command from above>
```