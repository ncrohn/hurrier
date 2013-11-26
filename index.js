var fs = require('fs');
var exec = require('child_process').exec;
var _ = require('underscore');
var request = require('request');

var CRAFTY_URL = process.env.CRAFTY_URL;
var TIMEOUT_DELAY = 30000;
var TIMEOUT_COUNT = 10;
var zeroCount = 0;

// The filename is simple the local directory and tacks on the requested url
var filename = '/var/log/upstart/minecraft-server.log';
var users = [];

function checkPlayers() {

  // This line opens the file as a readable stream
  var readStream = fs.createReadStream(filename);

  readStream.on('data', function(data) {

    var lines = data.toString('utf8').split('\n');

    console.log(lines);

    for(var i=0;i<lines.length;i++) {
      var line = lines[i];

      if (line.match(/joined/)) {
        var user = line.match(/ ([\w]+) joined/)[1];
        console.log(user);
        if(!_.contains(users, user)) {
          users.push(user);
        }
      } else if (line.match(/left/)) {
        var user = line.match(/ ([\w]+) left/)[1];
        users = _.without(users, user);
      }
    }

  });


  readStream.on('end', function() {

    if(users.length === 0) {
      zeroCount++;
      console.log('No players for %s minutes', ((zeroCount * TIMEOUT_DELAY)/1000)/60);
    } else {
      zeroCount = 0;
      console.log('Players: %s', users.length);
    }

    if(zeroCount >= TIMEOUT_COUNT) {
      exec('sudo shutdown -h now', function(error) {
        console.log(error);
      });
    }

    request.post(CRAFTY_URL, {json: {players: users.length}});

    setTimeout(checkPlayers, TIMEOUT_DELAY);

  });


  // This catches any errors that happen while creating the readable stream (usually invalid names)
  readStream.on('error', function(err) {
    throw new Error(err);
  });

}

setTimeout(checkPlayers, TIMEOUT_DELAY);