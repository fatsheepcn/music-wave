// var SOUNDS = ['./sounds/baby.mp3', './sounds/mailang.mp3'];
var SOUNDS = ['./sounds/baby.mp3'];

var myAudioContext,
    myAudioAnalyser,
    myBuffers = {},
    mySource,
    myNodes = {},
    mySpectrum,
    isPlaying = false;

function init() {
    try {
        myAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        myAudioAnalyser = myAudioContext.createAnalyser();
        myAudioAnalyser.fftSize = 256;
        myAudioAnalyser.smoothingTimeConstant = 0.85;
        myAudioAnalyser.connect(myAudioContext.destination);

        fetchSounds();
    } catch (e) {
         alert('Web Audio API not supported in this browser.');
    }
}

function fetchSounds() {
    for (var i = 0, len = SOUNDS.length; i < len; i++) {
        loadBuffer(SOUNDS[i], i);
    }
}

function loadBuffer(url, index) {
     var request = new XMLHttpRequest();
     request.open('GET', url, true);
     request.responseType = 'arraybuffer';

     request.onload = function () {
         myAudioContext.decodeAudioData(
             request.response,
             function (buffer) {
                 if (!buffer) {
                     alert('error decoding file data: ' + url);
                 }
                 myBuffers[index] = buffer;
                 document.querySelector('#loading').style.display = 'none';
                 document.querySelector('#play').style.display = 'block';
            },
            function (error) {
                console.error('decodeAudioData error', error);
            }
        );
    }

    request.onerror = function() {
        alert('BufferLoader: XHR error');
    }

    request.send();
}

function selectRandomBuffer() {
    var rand = Math.floor(Math.random() * SOUNDS.length);
    return myBuffers[rand];
}

function routeSound (source) {
    myNodes.filter = myAudioContext.createBiquadFilter();
    myNodes.panner = myAudioContext.createPanner();
    myNodes.volume = myAudioContext.createGain();

    //set node values to current slider values
    var filter = document.querySelector('#filter').value;
    var panX = document.querySelector('#pan').value;
    var volume = document.querySelector('#volume').value;

    myNodes.filter.type = "lowpass"; // lowpass
    myNodes.filter.frequency.value = filter;
    myNodes.panner.setPosition(panX, 0, 0);
    myNodes.volume.gain.value = volume;

    // pass source through series of nodes
    source.connect(myNodes.filter);
    myNodes.filter.connect(myNodes.panner);
    myNodes.panner.connect(myNodes.volume);
    myNodes.volume.connect(myAudioAnalyser);

    return source;
}

function playSound() {
    // create a new AudioBufferSourceNode
    var source = myAudioContext.createBufferSource();
    source.buffer = selectRandomBuffer();
    source.loop = true;
    source = routeSound(source);
    // play right now
    // can also pass myAudioContext.currentTime
    var offset = myAudioContext.currentTime || 0;
    source.start(0, offset);
    mySpectrum = setInterval(drawSpectrum, 30);
    mySource = source;
}

function pauseSound() {
    var source = mySource;
    source.stop(0);
    clearInterval(mySpectrum);
}

function toggleSound (button) {
    if (!isPlaying) {
        playSound();
        button.value = 'Pause';
        isPlaying = true;
    } else {
        pauseSound();
        button.value = 'Play';
        isPlaying = false;
    }
}

function drawSpectrum() {
    var canvas = document.querySelector('canvas');
    var canvasCtx = canvas.getContext('2d');
    var width = canvas.width;
    var height = canvas.height;
    var barWidht = Math.ceil( width / (myAudioAnalyser.frequencyBinCount * .85) );

    canvasCtx.clearRect(0, 0, width, height);

    var freqByteData = new Uint8Array(myAudioAnalyser.frequencyBinCount);
    myAudioAnalyser.getByteFrequencyData(freqByteData);

    var barCount = Math.round( width / barWidht);
    for (var i = 0; i < barCount; i++) {
        var magnitude = freqByteData[i];
        canvasCtx.fillStyle = 'rgb(0, 191, 255)';
        canvasCtx.fillRect(barWidht * i, height, barWidht-1, -magnitude + 60);
    }
}

function sliderChange(slider) {
    if (myAudioContext) {
        if (slider.id == 'filter') {
            var highpass = slider.value;
            myNodes.filter.frequency.value = highpass;
        } else if (slider.id == 'pan') {
            var panX = slider.value;
            myNodes.panner.setPosition(panX, 0, 0);
        } else if (slider.id == 'volume') {
            var volume = slider.value;
            myNodes.volume.gain.value = volume;
        }
    }
}

init();