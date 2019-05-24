'use strict';

const wrtc = require('wrtc');
const mic = require('mic');

class RTCAudioSourceMic {
    constructor(options = {}) {
        options = {
            endian: 'little',
            encoding: 'signed-integer',
            device: 'hw:0,0',
            channelCount: 2,
            sampleRate: 48000,
            schedule: setTimeout,
            unschedule: clearTimeout,
            ...options
        };

        const latency = .01;
        const sliceSize = options.sampleRate * options.channelCount * latency; // gives us 10 ms chunks
        const bits = 16;

        var micInstance = mic({
            endian: options.endian,
            encoding: options.encoding,
            rate: options.sampleRate,
            channels: options.channelCount,
            bitwidth: bits,
            device: options.device
        });

        const { RTCAudioSource } = require('wrtc').nonstandard;

        const source = new RTCAudioSource();

        let samples = new Int16Array(0);
        let micInputStream = micInstance.getAudioStream();

        // every time we get data from the mic append it to the existing buffer
        micInputStream.on('data', function(data) {
            let newSamples = new Int16Array(data.buffer);
            let mergedSamples = new Int16Array(samples.length + newSamples.length);
            mergedSamples.set(samples);
            mergedSamples.set(newSamples, samples.length);
            samples = mergedSamples;
        });


        let interval = setInterval(() => {
            // if there's enough data to read slice off 10ms worth and pass it to the track
            if (samples.length >= sliceSize) {
                let sampleSlice = samples.slice(0, sliceSize);
                samples = samples.slice(sliceSize);
                source.onData({
                    samples: sampleSlice,
                    sampleRate: options.sampleRate,
                    bitsPerSample: bits,
                    channelCount: options.channelCount,
                    numberOfFrames: sampleSlice.length / options.channelCount
                });
            } else {
                //console.log('U');
            }
        }, latency * 1000);

        micInstance.start();

        this.close = () => {
            clearInterval(interval);
            micInstance.stop();
        };

        this.createTrack = () => {
            return source.createTrack();
        };
    }
}

module.exports = RTCAudioSourceMic;
