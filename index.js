var start = null;
var isBlink = false;
var isRun = false;
var isShow = true;
var isWarned = false;
var handler = null;
var latency = 0;
var stopBy = null;
var delay = 1800000; // default 30 minutes
var audioRemind = null;
var audioEnd = null;
var actionLog = [];

function newAudio(file) {
  var node = new Audio();
  node.src = file;
  node.loop = false;
  node.load();
  document.body.appendChild(node);
  return node;
}

function soundToggle(des, state) {
  if (!des) return;
  if (state) {
    return des.play();
  }
  des.currentTime = 0;
  des.pause();
}

function show() {
  isShow = !isShow;
  $('.fbtn').css('opacity', isShow ? '1.0' : '0.25');
  $('#hide').text(isShow ? 'Hide nudges' : 'Show nudges');
  logAction(isShow ? 'Nudges revealed' : 'Nudges hidden');
}

function pad(num) {
  return num < 10 ? '0' + num : '' + num;
}

function formatTime(ms) {
  if (ms < 0) ms = 0;
  var totalSeconds = Math.floor(ms / 1000);
  var hours = Math.floor(totalSeconds / 3600);
  var minutes = Math.floor((totalSeconds % 3600) / 60);
  var seconds = totalSeconds % 60;
  var parts = [];
  if (hours > 0) {
    parts.push(pad(hours));
  }
  parts.push(pad(minutes));
  parts.push(pad(seconds));
  return parts.join(':');
}

function setTimerText(ms) {
  $('#timer').text(formatTime(ms));
  resize();
}

function describeSeconds(sec) {
  if (sec % 3600 === 0) {
    var hours = sec / 3600;
    return hours + ' hour' + (hours === 1 ? '' : 's');
  }
  if (sec % 60 === 0) {
    var mins = sec / 60;
    return mins + ' minute' + (mins === 1 ? '' : 's');
  }
  return sec + ' second' + (sec === 1 ? '' : 's');
}

function logAction(text) {
  var now = new Date();
  var stamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  actionLog.unshift({ text: text, stamp: stamp });
  if (actionLog.length > 8) {
    actionLog.pop();
  }
  var list = $('#action-log');
  if (!list.length) return;
  list.empty();
  actionLog.forEach(function (entry) {
    var item = $('<li class="action-item"></li>');
    item.append('<span class="action-time">' + entry.stamp + '</span>');
    item.append('<span class="action-text">' + entry.text + '</span>');
    list.append(item);
  });
}

function getRemainingMs() {
  if (start) {
    return start.getTime() - new Date().getTime() + delay + latency;
  }
  return delay;
}

function updateStatusLabel(text) {
  $('#status').text(text);
}

function updateCatLines(state) {
  var main = $('#cat-message-main');
  var secondary = $('#cat-message-secondary');
  switch (state) {
    case 'running':
      main.text("I'm stirring the pot and watching the clock.");
      secondary.text('I will give a polite paw tap when it is time to serve.');
      break;
    case 'done':
      main.text('Dinner bell! I am waiting by the bowl like a tiny human host.');
      secondary.text('Plates are set, napkins are folded—please feed the cats.');
      break;
    case 'paused':
    default:
      main.text('Everything is calm. The cats are sipping tea while you plan the meal.');
      secondary.text('Choose a preset and we will keep watch together.');
      break;
  }
}

function adjust(it, v, label) {
  if (isBlink) {
    $('#timer').removeClass('blinking');
    isBlink = false;
  }
  delay = delay + it * 1000;
  if (it === 0) {
    delay = v * 1000;
  }
  if (delay <= 0) {
    delay = 0;
  }
  if (!isRun) {
    start = null;
    latency = 0;
  }
  setTimerText(delay);
  var text = label;
  if (!text) {
    if (it === 0) {
      text = 'Set timer to ' + formatTime(delay);
    } else {
      text = (it > 0 ? 'Added ' : 'Removed ') + describeSeconds(Math.abs(it));
    }
  }
  logAction(text);
}

function toggle() {
  isRun = !isRun;
  $('#toggle').text(isRun ? 'Pause' : 'Start');
  updateStatusLabel(isRun ? 'Counting down' : 'Paused');
  if (!isRun && handler) {
    stopBy = new Date();
    clearInterval(handler);
    handler = null;
    soundToggle(audioEnd, false);
    soundToggle(audioRemind, false);
  }
  if (stopBy) {
    latency = latency + new Date().getTime() - stopBy.getTime();
  }
  if (isRun) {
    updateCatLines('running');
    logAction('Timer started: ' + formatTime(getRemainingMs()));
    run();
  } else {
    updateCatLines('paused');
    logAction('Timer paused with ' + formatTime(getRemainingMs()) + ' remaining');
  }
}

function reset() {
  if (delay === 0) {
    delay = 1000;
  }
  soundToggle(audioRemind, false);
  soundToggle(audioEnd, false);
  stopBy = 0;
  isWarned = false;
  isBlink = false;
  latency = 0;
  start = null;
  if (handler) {
    clearInterval(handler);
  }
  handler = null;
  isRun = false;
  $('#toggle').text('Start');
  updateStatusLabel('Paused');
  $('#timer').removeClass('blinking');
  setTimerText(delay);
  updateCatLines('paused');
  logAction('Timer reset to ' + formatTime(delay));
}

function count() {
  var diff = start.getTime() - new Date().getTime() + delay + latency;
  if (diff > 60000) {
    isWarned = false;
  }
  if (diff < 60000 && !isWarned) {
    isWarned = true;
    soundToggle(audioRemind, true);
  }
  if (diff < 55000) {
    soundToggle(audioRemind, false);
  }
  if (diff <= 0 && !isBlink) {
    finishCountdown();
    diff = 0;
  }
  setTimerText(diff);
}

function finishCountdown() {
  soundToggle(audioEnd, true);
  isBlink = true;
  isRun = false;
  start = null;
  latency = 0;
  stopBy = null;
  clearInterval(handler);
  handler = null;
  $('#toggle').text('Restart');
  updateStatusLabel('Feed now!');
  $('#timer').addClass('blinking');
  updateCatLines('done');
  logAction('Timer completed - feeding time!');
}

function run() {
  if (start === null) {
    start = new Date();
    latency = 0;
    isBlink = false;
    $('#timer').removeClass('blinking');
  }
  if (handler) {
    clearInterval(handler);
  }
  handler = setInterval(function () {
    return count();
  }, 200);
}

function resize() {
  var tm = $('#timer');
  var w = tm.width();
  var len = tm.text().length;
  var size = Math.max(44, Math.min(90, (1.8 * w) / (len + 1)));
  tm.css('font-size', size + 'px');
}

window.onload = function () {
  setTimerText(delay);
  resize();
  audioRemind = newAudio('audio/smb_warning.mp3');
  audioEnd = newAudio('audio/smb_mariodie.mp3');
  updateCatLines('paused');
  logAction('Opened timer - cats are watching.');
};

window.onresize = function () {
  return resize();
};
