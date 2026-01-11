use std::{cell::RefCell, rc::Rc};

use crate::{buffer::Buffer, env::Env, grain::Grain, time::clock::Clock, tuning::tune_equal};

/// Grain producer
pub struct Stream {
    enabled: bool,
    clock: Rc<RefCell<Clock>>,
    grain_start: f32,
    grain_size_ms: usize,
    gain: f32,
    tune: i32,
    pan: f32,
    env: Env,
}

impl Stream {
    pub fn new(
        clock: Rc<RefCell<Clock>>,
        grain_start: f32,
        grain_size_ms: usize,
        gain: f32,
        tune: i32,
        pan: f32,
        env: Env,
    ) -> Self {
        Self {
            enabled: false,
            clock,
            grain_start,
            grain_size_ms,
            gain,
            tune,
            pan,
            env,
        }
    }

    pub fn default_with_clock(clock: Rc<RefCell<Clock>>) -> Self {
        Self::new(clock, 0., 250, 1., 0, 0.5, Env::Tri)
    }

    pub fn spawn_new_grains(
        &self,
        stream_idx: usize,
        note: u32,
        sample: &Buffer,
        sample_rate: usize,
    ) -> Option<Grain> {
        if self.enabled && self.clock.borrow().is_zero() {
            let i = sample.len as f32 * self.grain_start;
            let len = (sample_rate as f32 / 1000.) * self.grain_size_ms as f32;
            let end = f32::min(sample.len as f32, i + len);
            let incr = tune_equal(1., (note as i32) + self.tune - 60);
            Some(Grain::new(
                stream_idx, i, end, incr, self.gain, self.pan, self.env,
            ))
        } else {
            None
        }
    }

    pub fn tick(&mut self) {
        self.clock.borrow_mut().tick();
    }

    pub fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }

    pub fn subdivide_clock(&mut self, subdivision: f64) {
        self.clock.borrow_mut().subdivide(subdivision);
    }

    pub fn set_grain_start(&mut self, grain_start: f32) {
        self.grain_start = grain_start;
    }

    pub fn set_grain_size_ms(&mut self, grain_size_ms: usize) {
        self.grain_size_ms = grain_size_ms;
    }

    pub fn set_gain(&mut self, gain: f32) {
        self.gain = gain;
    }

    pub fn set_tune(&mut self, tune: i32) {
        self.tune = tune;
    }

    pub fn set_pan(&mut self, pan: f32) {
        self.pan = pan;
    }

    pub fn set_env(&mut self, env: Env) {
        self.env = env;
    }
}
