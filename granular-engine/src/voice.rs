use std::{cell::RefCell, collections::VecDeque, rc::Rc};

use crate::{
    adsr::Adsr,
    buffer::Buffer,
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
    notes: MruNotes,
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
            notes: MruNotes::with_capacity(6),
            streams: vec![Stream::default_from_clock(clock); S],
            grains: GrainPool::new(512),
        }
    }

    pub fn reset_grains(&mut self) {
        self.grains.reset();
    }

    pub fn spawn_new_grains(&mut self, sample: &Buffer, sample_rate: usize) {
        if !self.adsr_env.is_open() {
            return;
        }
        let note = if let Some(note) = self.notes.current() {
            note
        } else {
            // this would indicate a bug
            return;
        };
        for (i, stream) in self.streams.iter().enumerate() {
            if let Some(grain) = stream.spawn_new_grains(i, note, sample, sample_rate) {
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
        if !self.adsr_env.is_open() && self.notes.len() > 0 {
            self.notes.clear();
        }
    }

    pub fn set_adsr(&mut self, attack: usize, decay: usize, sustain: f32, release: usize) {
        // prevents bug where 0-length ramp phases create total silence
        let attack = if attack == 0 { 1 } else { attack };
        let decay = if decay == 0 { 1 } else { decay };
        let release = if release == 0 { 1 } else { release };
        self.adsr_env.set_adsr(attack, decay, sustain, release);
    }

    pub fn note_on(&mut self, note: u32) {
        if !self.gate {
            // we may be in the release phase, in which case we want to remove
            // the sustaining note
            self.notes.clear();
            self.gate = true;
            self.adsr_env.set_gate(self.gate);
        }
        self.notes.add(note);
    }

    pub fn note_off(&mut self, note: u32) {
        if !self.gate {
            return;
        }
        if self.notes.len() == 1 {
            // we have to keep the final note around to spawn grains as the
            // envelope winds down. it will be removed from the stack when the
            // ADSR closes completely.
            self.gate = false;
            self.adsr_env.set_gate(self.gate);
        } else {
            self.notes.remove(note);
        }
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

/// Most-recently-used stack of notes for a monophonic voice. Works fine for
/// small stack sizes, but note that removals are O(N) where N is the stack
/// size.
struct MruNotes {
    capacity: usize,
    stack: VecDeque<u32>,
}

impl MruNotes {
    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            capacity,
            stack: VecDeque::with_capacity(capacity),
        }
    }

    pub fn current(&self) -> Option<u32> {
        self.stack.front().copied()
    }

    pub fn len(&self) -> usize {
        self.stack.len()
    }

    pub fn add(&mut self, note: u32) {
        if self.stack.len() >= self.capacity {
            return;
        }

        if let Some(top_note) = self.stack.front() {
            if note == *top_note {
                return;
            }
        }

        self.stack.push_front(note);
    }

    pub fn remove(&mut self, note: u32) {
        if let Some(index) =
            self.stack
                .iter()
                .enumerate()
                .find_map(|(i, n)| if note == *n { Some(i) } else { None })
        {
            self.stack.remove(index);
        }
    }

    pub fn clear(&mut self) {
        self.stack.clear();
    }
}
