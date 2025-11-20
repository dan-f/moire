use std::{cell::RefCell, rc::Rc};

use crate::{
    adsr::Adsr,
    buffer::StereoBuffer,
    env::Env,
    grain_pool::{self, GrainPool},
    stream::Stream,
    timing::Clock,
};

/// Synth voice managing a collection of playback [Stream]s
pub struct Voice<const S: usize> {
    gate: bool,
    adsr_env: Adsr,
    /// MIDI note
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
        Voice {
            gate: false,
            adsr_env: Adsr::new(attack, decay, sustain, release),
            note: 60,
            streams: vec![Stream::default_from_clock(clock); S],
            grains: GrainPool::new(512),
        }
    }

    pub fn reset_grains(&mut self) {
        self.grains.reset();
    }

    pub fn spawn_new_grains(&mut self, sample: &StereoBuffer) {
        if !self.adsr_env.is_open() {
            return;
        }
        for (i, stream) in self.streams.iter().enumerate() {
            if let Some(grain) = stream.spawn_new_grains(i, self.note, sample) {
                self.grains.add(grain);
            }
        }
    }

    pub fn render_frame(
        &mut self,
        sample: &StereoBuffer,
        frame: &mut [f32; 2],
        playhead_positions: &mut [f32],
    ) {
        if !self.adsr_env.is_open() {
            return;
        }
        let gain = self.adsr_env.gain();
        for grain in self.grains.entries() {
            let f = grain.render_frame(sample);
            frame[0] += f[0];
            frame[1] += f[1];
            playhead_positions[grain.stream_idx()] = grain.normalized_pos(sample);
        }
        frame[0] *= gain;
        frame[1] *= gain;
    }

    pub fn tick(&mut self) {
        for grain in self.grains.entries() {
            grain_pool::tick(grain);
        }
        self.adsr_env.tick();
    }

    pub fn set_adsr(&mut self, attack: usize, decay: usize, sustain: f32, release: usize) {
        self.adsr_env.set_adsr(attack, decay, sustain, release);
    }

    pub fn set_gate(&mut self, gate: bool) {
        if gate == self.gate {
            return;
        }
        self.gate = gate;
        self.adsr_env.set_gate(gate);
    }

    pub fn set_note(&mut self, note: u32) {
        self.note = note;
    }

    pub fn set_enabled(&mut self, stream_id: usize, enabled: bool) {
        self.with_stream(stream_id, |stream| {
            stream.set_enabled(enabled);
        });
    }

    pub fn set_subdivision(&mut self, stream_id: usize, subdivision: u32) {
        self.with_stream(stream_id, |stream| {
            stream.set_subdivision(subdivision);
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
