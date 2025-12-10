use std::{cell::RefCell, rc::Rc};

use crate::{
    buffer::Buffer,
    env::Env,
    timing::{self, Clock},
    voice_manager::{VoiceManager, VoiceMode},
};

pub struct Engine<const S: usize> {
    sample_rate: usize,
    clock: Rc<RefCell<Clock>>,
    params: EngineParams,
    last_tick: u64,
    last_note_event: i32,
    voices: VoiceManager<8, S>,
}

impl<const S: usize> Engine<S> {
    pub fn new(cfg: EngineConfig, params: EngineParams) -> Self {
        let clock = Rc::new(RefCell::new(Clock::new(
            cfg.sample_rate,
            timing::bpm_to_freq(params.bpm),
        )));
        let EngineParams {
            bpm: _,
            attack_ms,
            decay_ms,
            sustain,
            release_ms,
        } = params;
        Self {
            sample_rate: cfg.sample_rate,
            clock: Rc::clone(&clock),
            params,
            last_tick: 0,
            last_note_event: 0,
            voices: VoiceManager::new(
                VoiceMode::Poly,
                &clock,
                timing::ms_to_samples(cfg.sample_rate, attack_ms),
                timing::ms_to_samples(cfg.sample_rate, decay_ms),
                sustain,
                timing::ms_to_samples(cfg.sample_rate, release_ms),
            ),
        }
    }

    pub fn reset_after_update_sample(&mut self) {
        self.voices.reset_grains();
    }

    pub fn set_bpm(&mut self, bpm: u32) {
        if bpm == self.params.bpm {
            return;
        }
        self.params.bpm = bpm;
        self.clock.borrow_mut().set_freq(timing::bpm_to_freq(bpm));
    }

    pub fn set_adsr(&mut self, attack_ms: u32, decay_ms: u32, sustain: f32, release_ms: u32) {
        self.params.attack_ms = attack_ms;
        self.params.decay_ms = decay_ms;
        self.params.sustain = sustain;
        self.params.release_ms = release_ms;
        self.voices.set_adsr(
            timing::ms_to_samples(self.sample_rate, attack_ms),
            timing::ms_to_samples(self.sample_rate, decay_ms),
            sustain,
            timing::ms_to_samples(self.sample_rate, release_ms),
        );
    }

    pub fn set_stream_enabled(&mut self, stream_id: usize, enabled: bool) {
        self.voices.set_stream_enabled(stream_id, enabled);
    }

    pub fn set_stream_subdivision(&mut self, stream_id: usize, subdivision: u32) {
        self.voices.set_stream_subdivision(stream_id, subdivision);
    }

    pub fn set_stream_grain_start(&mut self, stream_id: usize, grain_start: f32) {
        self.voices.set_stream_grain_start(stream_id, grain_start);
    }

    pub fn set_stream_grain_size_ms(&mut self, stream_id: usize, grain_size_ms: usize) {
        self.voices
            .set_stream_grain_size_ms(stream_id, grain_size_ms);
    }

    pub fn set_stream_gain(&mut self, stream_id: usize, gain: f32) {
        self.voices.set_stream_gain(stream_id, gain);
    }

    pub fn set_stream_tune(&mut self, stream_id: usize, tune: i32) {
        self.voices.set_stream_tune(stream_id, tune);
    }

    pub fn set_stream_pan(&mut self, stream_id: usize, pan: f32) {
        self.voices.set_stream_pan(stream_id, pan);
    }

    pub fn set_stream_env(&mut self, stream_id: usize, env: Env) {
        self.voices.set_stream_env(stream_id, env);
    }

    /// Positive-valued `note_event`s indicate a note-on event for the MIDI note
    /// with the value `note_event - 1`. Negative-valued events indicate
    /// note-off events for abs(note_event) - 1.
    pub fn apply_note_event(&mut self, note_event: i32) {
        if note_event == 0 || note_event == self.last_note_event {
            return;
        }

        self.last_note_event = note_event;

        let note = note_event.abs() as u32 - 1;
        if note_event > 0 {
            self.voices.note_on(note, self.last_tick);
        } else {
            self.voices.note_off(note);
        }
    }

    pub fn process(
        &mut self,
        sample_buf: &Buffer,
        output_buf: &mut Buffer,
        playheads_buf: &mut Buffer,
    ) {
        for i in 0..output_buf.len {
            let mut frame = [0., 0.];

            // TODO - polyphonic playhead positions
            let mut playhead_positions = [-1.; S];
            self.voices.spawn_new_grains(&sample_buf, self.sample_rate);
            self.voices
                .render_frame(sample_buf, &mut frame, &mut playhead_positions);
            self.voices.tick();

            output_buf[0][i] = frame[0];
            output_buf[1][i] = frame[1];
            for (s, pos) in playhead_positions.iter().enumerate() {
                playheads_buf[s][i] = *pos;
            }

            self.clock.borrow_mut().tick();
            self.last_tick += 1;
        }
    }
}

pub struct EngineConfig {
    pub sample_rate: usize,
    pub output_buf_len: usize,
    pub output_buf_capacity: usize,
}

pub struct EngineParams {
    pub bpm: u32,
    pub attack_ms: u32,
    pub decay_ms: u32,
    pub sustain: f32,
    pub release_ms: u32,
}

impl Default for EngineParams {
    fn default() -> Self {
        Self {
            bpm: 60,
            attack_ms: 100,
            decay_ms: 50,
            sustain: 0.5,
            release_ms: 250,
        }
    }
}
