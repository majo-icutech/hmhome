const async = require('async');
const express = require('express');
const fs = require('fs');
const https = require('https')
const url = require('url');

const app = express();
const port = 4449;

function getDevice(device, channel, datapoint, callback) {
  const path = '/device/' + device + '/' + channel + '/' + datapoint + '/~pv';

  const options = {
    hostname: 'localhost',
    port: 2122,
    path: path,
    method: 'GET',
    auth: 'has:5mUQzSXLwASQtRm',
    rejectUnauthorized: false,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': 0
    }
  };

  var request_data = '';

  const req = https.request(options, res => {
    if (res.statusCode == 200) {
      res.on('data', d => {
        request_data += d;
      });

      res.on('end', () => {
        var data = {};
        try {
          data = JSON.parse(request_data);
        }
        catch (e) {
          data.error = 'JSON error: '+ e.toString() + ' ' + request_data;
        }
        callback(null, data);
      });
    }
    else {
      callback(res.statusCode + ': ' + res.statusMessage);
    }
  });

  req.on('error', error => {
    callback(error);
  });

  req.end();
}

function setDevice(device, channel, datapoint, value, callback) {
  const path = '/device/' + device + '/' + channel + '/' + datapoint + '/~pv';
  const content = JSON.stringify({
    v: value
  });

  const options = {
    hostname: 'localhost',
    port: 2122,
    path: path,
    method: 'PUT',
    auth: 'has:5mUQzSXLwASQtRm',
    rejectUnauthorized: false,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': content.length
    }
  };

  var request_data = '';

  const req = https.request(options, res => {
    if (res.statusCode == 200) {
      res.on('end', () => {
        callback(null);
      });
    }
    else {
      callback(res.statusCode + ': ' + res.statusMessage);
    }
  });

  req.on('error', error => {
    callback(error);
  });

  req.write(content);
  req.end();
}

const config = JSON.parse(fs.readFileSync('hmhome.cfg'));
const devices = config.devices;

var long_on = {
  1: { active: false, timeout: null },
  2: { active: false, timeout: null },
  3: { active: false, timeout: null },
  4: { active: false, timeout: null },
  5: { active: false, timeout: null },
  6: { active: false, timeout: null }
};

app.get('/cux/set/short', (req, res) => {
  var req_q = url.parse(req.url, true).query;

  if (devices[req_q.id]) {
    var device = devices[req_q.id];

    async.map(device.addresses, (address, callback) => {
      getDevice(address, 3, 'WORKING', (err, data) => {
        callback(err, data.v);
      });
    }, (err, result) => {
      if (!err) {
        const working = result.reduce((a, b) => a || b);
        console.log('short', device.addresses, device.level, working);

        if (working) {
          async.map(device.addresses, (address, callback) => {
            setDevice(address, 3, 'STOP', true, (err) => {
              callback(err);
            });
          }, (err,) => {
            if (err) console.log('short', err);
          });
        }
        else {
          async.map(device.addresses, (address, callback) => {
            setDevice(address, 3, 'LEVEL', device.level, (err) => {
              callback(err);
            });
          }, (err) => {
            if (err) console.log('short', err);
          });
        }
      }
      else {
        console.log('short', err);
      }
    });
  }

  res.send('OK');
});

app.get('/cux/set/long', (req, res) => {
  var req_q = url.parse(req.url, true).query;

  if (devices[req_q.id]) {
    var device = devices[req_q.id];

    //console.log('long', Date.now(), device.addresses, device.level);

    var stopTimeout = () => {
      long_on[req_q.id].timeout = setTimeout(() => {
        long_on[req_q.id].active = false;
        console.log('long', 'end', device.addresses, device.level);
        async.map(device.addresses, (address, callback) => {
          setDevice(address, 3, 'STOP', true, (err) => {
            callback(err);
          });
        }, (err,) => {
          if (err) console.log('short', err);
        });
      }, 300);
    }

    if (long_on[req_q.id].active == false) {
      async.map(device.addresses, (address, callback) => {
        setDevice(address, 3, 'LEVEL', device.level, (err) => {
          callback(err);
        });
      }, (err) => {
        if (err) console.log('short', err);
      });
      console.log('long', 'start', device.addresses, device.level);

      long_on[req_q.id].active = true;
      stopTimeout();
    }
    else {
      clearTimeout(long_on[req_q.id].timeout);
      stopTimeout();
    }
  }

  res.send('OK');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

