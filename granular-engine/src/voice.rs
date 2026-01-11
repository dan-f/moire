use std::{cell::RefCell, rc::Rc};

use crate::{
    adsr::Adsr,
    buffer::Buffer,
    env::Env,
    grain_pool::{self, GrainPool},
    stream::Stream,
    time::clock::{self, Clock},
};

/// Synth voice managing a collection of playback [Stream]s
pub struct Voice<const S: usize> {
    pub adsr: Adsr,
    clock: Rc<RefCell<Clock>>,
    note: u32,
    streams: Vec<Stream>,
    grains: GrainPool,
}

impl<const S: usize> Voice<S> {
    pub fn new(
        clock: Rc<RefCell<Clock>>,
        attack: usize,
        decay: usize,
        sustain: f32,
        release: usize,
    ) -> Self {
        let streams: Vec<_> = (0..S)
            .map(|_| Stream::default_with_clock(clock::add_child(&clock)))
            .collect();

        Voice {
            adsr: Adsr::new(attack, decay, sustain, release),
            clock,
            note: 60,
            streams,
            grains: GrainPool::new(512),
        }
    }

    pub fn reset_grains(&mut self) {
        self.grains.reset();
    }

    pub fn spawn_new_grains(&mut self, sample: &Buffer, sample_rate: usize) {
        if !self.adsr.is_open() {
            return;
        }
        for (i, stream) in self.streams.iter().enumerate() {
            if let Some(grain) = stream.spawn_new_grains(i, self.note, sample, sample_rate) {
                self.grains.add(grain);
            }
        }
    }

    pub fn render_frame(
        &mut self,
        sample: &Buffer,
        frame: &mut [f32; 2],
        playhead_positions: &mut [f32],
    ) {
        if !self.adsr.is_open() {
            return;
        }
        let gain = self.adsr.gain();
        for grain in self.grains.entries() {
            let f = grain.render_frame(sample);
            frame[0] += f[0] * gain;
            frame[1] += f[1] * gain;
            playhead_positions[grain.stream_idx()] = grain.normalized_pos(sample);
        }
    }

    pub fn tick(&mut self) {
        self.clock.borrow_mut().tick();
        for grain in self.grains.entries() {
            grain_pool::tick(grain);
        }
        for stream in &mut self.streams {
            stream.tick();
        }
        self.adsr.tick();
    }

    pub fn set_adsr(&mut self, attack: usize, decay: usize, sustain: f32, release: usize) {
        // prevents bug where 0-length ramp phases create total silence
        let attack = if attack == 0 { 1 } else { attack };
        let decay = if decay == 0 { 1 } else { decay };
        let release = if release == 0 { 1 } else { release };
        self.adsr.set_adsr(attack, decay, sustain, release);
    }

    pub fn set_note(&mut self, note: u32) {
        self.note = note;
    }

    pub fn set_gate(&mut self, gate: bool) {
        self.adsr.set_gate(gate);
    }

    pub fn set_enabled(&mut self, stream_id: usize, enabled: bool) {
        self.with_stream(stream_id, |stream| {
            stream.set_enabled(enabled);
        });
    }

    pub fn stop_lead_clock(&mut self) {
        self.clock.borrow_mut().stop();
    }

    pub fn resume_lead_clock(&mut self) {
        self.clock.borrow_mut().resume();
    }

    pub fn set_lead_clock_freq(&mut self, freq: f64) {
        self.clock.borrow_mut().set_freq(freq);
    }

    pub fn subdivide_stream_clock(&mut self, stream_id: usize, subdivision: f64) {
        self.with_stream(stream_id, |stream| {
            stream.subdivide_clock(subdivision);
        });
    }

    pub fn set_grain_start(&mut self, stream_id: usize, grain_start: f32) {
        self.with_stream(stream_id, |stream| {
            stream.set_grain_start(grain_start);
        });
    }

    pub fn set_grain_size_ms(&mut self, stream_id: usize, grain_size_ms: usize) {
        self.with_stream(stream_id, |stream| {
            stream.set_grain_size_ms(grain_size_ms);
        });
    }

    pub fn set_gain(&mut self, stream_id: usize, gain: f32) {
        self.with_stream(stream_id, |stream| {
            stream.set_gain(gain);
        });
    }

    pub fn set_tune(&mut self, stream_id: usize, tune: i32) {
        self.with_stream(stream_id, |stream| {
            stream.set_tune(tune);
        });
    }

    pub fn set_pan(&mut self, stream_id: usize, pan: f32) {
        self.with_stream(stream_id, |stream| {
            stream.set_pan(pan);
        });
    }

    pub fn set_env(&mut self, stream_id: usize, env: Env) {
        self.with_stream(stream_id, |stream| {
            stream.set_env(env);
        });
    }

    fn with_stream(&mut self, stream_id: usize, f: impl FnOnce(&mut Stream) -> ()) {
        if let Some(stream) = self.streams.get_mut(stream_id) {
            f(stream);
        }
    }
}
