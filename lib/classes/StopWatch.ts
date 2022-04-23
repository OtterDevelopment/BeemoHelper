// Copyright (c) 2019 dirigeants, MIT License

import { performance } from "perf_hooks";

/**
 * Our Stopwatch class, uses native node to replicate/extend previous performance now dependency.
 */
export default class Stopwatch {
    /**
     * The number of digits to appear after the decimal point when returning the friendly duration.
     */
    public digits: number;

    /**
     * The start time of this stopwatch
     */
    private _start: number;

    /**
     * The end time of this stopwatch
     */
    private _end?: number;

    /**
     * Starts a new Stopwatch
     * @param [digits=2] The number of digits to appear after the decimal point when returning the friendly duration
     */
    constructor(digits = 2) {
        this.digits = digits;
        this._start = performance.now();
        this._end = undefined;
    }

    /**
     * The duration of this stopwatch since start or start to end if this stopwatch has stopped.
     */
    get duration() {
        return this._end
            ? this._end - this._start
            : performance.now() - this._start;
    }

    /**
     * If the stopwatch is running or not
     */
    get running() {
        return Boolean(!this._end);
    }

    /**
     * Restarts the Stopwatch (Returns a running state)
     */
    restart() {
        this._start = performance.now();
        this._end = undefined;
        return this;
    }

    /**
     * Resets the Stopwatch to 0 duration (Returns a stopped state)
     */
    reset() {
        this._start = performance.now();
        this._end = this._start;
        return this;
    }

    /**
     * Starts the Stopwatch
     */
    start() {
        if (!this.running) {
            this._start = performance.now() - this.duration;
            this._end = undefined;
        }
        return this;
    }

    /**
     * Stops the Stopwatch, freezing the duration
     */
    stop() {
        if (this.running) this._end = performance.now();
        return this;
    }

    /**
     * Defines toString behavior
     */
    toString() {
        const time = this.duration;
        if (time >= 1000) return `${(time / 1000).toFixed(this.digits)}s`;
        if (time >= 1) return `${time.toFixed(this.digits)}ms`;
        return `${(time * 1000).toFixed(this.digits)}μs`;
    }
}
