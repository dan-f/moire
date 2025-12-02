use std::{cell::RefCell, rc::Rc};

use crate::{
    buffer::{MonoBuffer, StereoBuffer},
    timing::{self, Clock},
    voice::Voice,
};

pub struct Engine<const S: usize = 12> {
    sample_rate: usize,
    clock: Rc<RefCell<Clock>>,
    sample_buf: Option<StereoBuffer>,
    output_buf: StereoBuffer,
    playhead_bufs: Vec<MonoBuffer>,
    params: EngineParams,
    last_note_event: i32,
    pub voice: Voice<S>,
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
            sample_buf: None,
            output_buf: StereoBuffer::new_with_capacity(
                cfg.sample_rate,
                cfg.output_buf_len,
                cfg.output_buf_capacity,
            ),
            // TODO(poly) account for the fact that we need another addressing
            // dimension (voice x streams)
            playhead_bufs: (0..S)
                .into_iter()
                .map(|_| {
                    MonoBuffer::new_with_capacity(
                        cfg.sample_rate,
                        cfg.output_buf_len,
                        cfg.output_buf_capacity,
                    )
                })
                .collect(),
            params,
            last_note_event: -1,
            voice: Voice::new(
                Rc::clone(&clock),
                timing::ms_to_samples(cfg.sample_rate, attack_ms),
                timing::ms_to_samples(cfg.sample_rate, decay_ms),
                sustain,
                timing::ms_to_samples(cfg.sample_rate, release_ms),
            ),
        }
    }

    pub fn alloc_sample_buf(&mut self, buf_len: usize) {
        self.sample_buf
            .replace(StereoBuffer::new(self.sample_rate, buf_len));
    }

    // TODO(poly) reset all voices grain pools
    pub fn reset_after_update_sample(&mut self) {
        self.voice.reset_grains();
    }

    pub fn sample_buf(&self, channel: usize) -> Option<&[f32]> {
        self.sample_buf.as_ref().map(|buf| buf.channel(channel))
    }

    pub fn output_buf(&self, channel: usize) -> &[f32] {
        &self.output_buf.channel(channel)
    }

    pub fn playhead_buf(&self, idx: usize) -> &[f32] {
        &self.playhead_bufs[idx].channel(0)
    }

    pub fn alloc_output_bufs(&mut self, new_capacity: usize, new_len: usize) {
        self.output_buf.resize(new_capacity, new_len);
        for buf in self.playhead_bufs.iter_mut() {
            buf.resize(new_capacity, new_len);
        }
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
        self.voice.set_adsr(
            timing::ms_to_samples(self.sample_rate, attack_ms),
            timing::ms_to_samples(self.sample_rate, decay_ms),
            sustain,
            timing::ms_to_samples(self.sample_rate, release_ms),
        );
    }

    // Note one potential flaw with this approach: since we have a single stream
    // of linearized note events at k-rate, it's theoretically possible that the
    // user could have a collision of two note events in the same buffer window,
    // i.e. hitting two keys at exactly the same time. I'm not yet sure if this
    // will be an issue in practice, but it seems it certainly could be, as a
    // 512 buffer size at 48kHz gives a 10.67ms window for collisions. A cheap
    // (but not perfect) mitigation would be to make it a-rate, reducing the
    // collision window to hundredths of a millisecond.
    //
    // Alternatively invert the management of polyphony and give the caller `V`
    // parallel note event streams per-voice. It would then be the caller's
    // responsibility to map note events to voices
    pub fn set_note_event(&mut self, note_event: i32) {
        if note_event == self.last_note_event {
            return;
        }
        self.last_note_event = note_event;

        let note = note_event.abs() as u32;
        if note_event >= 0 {
            self.voice.note_on(note);
        } else {
            self.voice.note_off(note);
        }
    }

    pub fn process(&mut self) {
        if let Some(sample_buf) = &self.sample_buf {
            for i in 0..self.output_buf.len {
                let mut frame = [0., 0.];

                let mut playhead_positions = [-1.; S];
                self.voice.spawn_new_grains(&sample_buf);
                self.voice
                    .render_frame(sample_buf, &mut frame, &mut playhead_positions);
                self.voice.tick();

                self.output_buf.write_frame(i, &frame);
                for s in 0..S {
                    self.playhead_bufs[s].write_frame(i, &[playhead_positions[s]]);
                }

                self.clock.borrow_mut().tick();
            }
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
