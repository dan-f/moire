use std::{array, cell::RefCell, rc::Rc};

use crate::{buffer::Buffer, env::Env, grain, timing::Clock, voice::Voice};

pub struct VoiceManager<const V: usize, const S: usize> {
    mode: VoiceMode,
    voices: [Voice<S>; V],
    /// In mono mode, functions as a stack of pseudo-voices to enable expected
    /// behavior when layering more than one note: the most-recently played note
    /// will always ring out.
    ///
    /// In poly mode, functions as an assignment table, where the voice with the
    /// corresponding index is either off when the assignment is `None`, and
    /// otherwise is active when the assignment holds a value.
    assignments: [Option<Assignment>; V],
}

impl<const V: usize, const S: usize> VoiceManager<V, S> {
    pub fn new(
        mode: VoiceMode,
        clock: &Rc<RefCell<Clock>>,
        // TODO refactor these into an AdsrParams struct or something
        attack: usize,
        decay: usize,
        sustain: f32,
        release: usize,
    ) -> Self {
        Self {
            mode,
            voices: array::from_fn(|_| {
                Voice::new(Rc::clone(clock), attack, decay, sustain, release)
            }),
            assignments: [const { None }; V],
        }
    }

    pub fn set_mode(&mut self, mode: VoiceMode) {
        self.mode = mode;
    }

    pub fn reset_grains(&mut self) {
        for voice in self.voices.iter_mut() {
            voice.reset_grains();
        }
    }

    pub fn set_adsr(&mut self, attack: usize, decay: usize, sustain: f32, release: usize) {
        for voice in self.voices.iter_mut() {
            voice.set_adsr(attack, decay, sustain, release);
        }
    }

    pub fn set_stream_enabled(&mut self, stream_id: usize, enabled: bool) {
        for voice in self.voices.iter_mut() {
            voice.set_enabled(stream_id, enabled);
        }
    }

    pub fn set_stream_subdivision(&mut self, stream_id: usize, subdivision: u32) {
        for voice in self.voices.iter_mut() {
            voice.set_subdivision(stream_id, subdivision);
        }
    }

    pub fn set_stream_grain_start(&mut self, stream_id: usize, grain_start: f32) {
        for voice in self.voices.iter_mut() {
            voice.set_grain_start(stream_id, grain_start);
        }
    }

    pub fn set_stream_grain_size_ms(&mut self, stream_id: usize, grain_size_ms: usize) {
        for voice in self.voices.iter_mut() {
            voice.set_grain_size_ms(stream_id, grain_size_ms);
        }
    }

    pub fn set_stream_gain(&mut self, stream_id: usize, gain: f32) {
        for voice in self.voices.iter_mut() {
            voice.set_gain(stream_id, gain);
        }
    }

    pub fn set_stream_tune(&mut self, stream_id: usize, tune: i32) {
        for voice in self.voices.iter_mut() {
            voice.set_tune(stream_id, tune);
        }
    }

    pub fn set_stream_pan(&mut self, stream_id: usize, pan: f32) {
        for voice in self.voices.iter_mut() {
            voice.set_pan(stream_id, pan);
        }
    }

    pub fn set_stream_env(&mut self, stream_id: usize, env: Env) {
        for voice in self.voices.iter_mut() {
            voice.set_env(stream_id, env);
        }
    }

    pub fn note_on(&mut self, note: u32, on_at: u64) {
        if self.mode == VoiceMode::Mono {
            // claim the free pseudo-voice, if available
            let i = self.assignments.iter().enumerate().find_map(|(i, a)| {
                if a.is_none() {
                    Some(i)
                } else {
                    None
                }
            });
            let i = if let Some(index) = i {
                index
            } else {
                return;
            };
            self.assignments[i] = Some(Assignment { note, on_at });

            // deal with voice
            self.voices[0].set_note(note);
            if i == 0 {
                self.voices[0].set_gate(true);
            }
        } else {
            // find either a free voice, or a voice to steal
        }
    }

    pub fn note_off(&mut self, note: u32) {
        if self.mode == VoiceMode::Mono {
            let i = self.assignments.iter().enumerate().find_map(|(i, a)| {
                if a.as_ref().is_some_and(|a| a.note == note) {
                    Some(i)
                } else {
                    None
                }
            });
            let i = if let Some(index) = i {
                index
            } else {
                return;
            };

            if i == 0 {
                self.assignments[i].take();
                self.voices[0].set_gate(false);
            } else {
                // compress / shift-back notes
                for cur in i..(V - 1) {
                    if self.assignments[cur].is_none() {
                        break;
                    }
                    self.assignments[cur] = self.assignments[cur + 1].take();
                }
                // find and play top note
                let mut cur_note = None;
                for a in self.assignments.iter() {
                    if let Some(Assignment { note, .. }) = a {
                        cur_note.replace(*note);
                    }
                }
                if let Some(note) = cur_note {
                    self.voices[0].set_note(note);
                }
            }
        } else {
            // TODO(poly)
        }
    }

    pub fn spawn_new_grains(&mut self, sample: &Buffer, sample_rate: usize) {
        if self.mode == VoiceMode::Mono {
            self.voices[0].spawn_new_grains(sample, sample_rate);
        } else {
            // TODO(poly)
        }
    }

    pub fn render_frame(
        &mut self,
        sample: &Buffer,
        frame: &mut [f32; 2],
        playhead_positions: &mut [f32],
    ) {
        if self.mode == VoiceMode::Mono {
            self.voices[0].render_frame(sample, frame, playhead_positions)
        } else {
            // TODO(poly)
            todo!()
        }
    }

    pub fn tick(&mut self) {
        for voice in self.voices.iter_mut() {
            voice.tick();
        }
    }
}

#[derive(PartialEq)]
pub enum VoiceMode {
    Mono,
    Poly,
}

struct Assignment {
    note: u32,
    on_at: u64,
}
