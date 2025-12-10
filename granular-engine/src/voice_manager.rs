use std::{array, cell::RefCell, rc::Rc};

use crate::{buffer::Buffer, env::Env, timing::Clock, voice::Voice};

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
        for voice in self.voices.iter_mut() {
            voice.set_gate(false);
        }
        self.assignments.fill(None);
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
            // find either a free voice, or steal the oldest assigned voice
            let mut voice_idx = None;
            let mut min_age = u64::MAX;
            for (i, a) in self.assignments.iter().enumerate() {
                if let Some(Assignment { on_at, .. }) = a {
                    if *on_at <= min_age {
                        min_age = *on_at;
                        voice_idx.replace(i);
                    }
                } else {
                    voice_idx.replace(i);
                    break;
                }
            }
            let voice_idx = if let Some(i) = voice_idx {
                i
            } else {
                // bug
                return;
            };
            self.assignments[voice_idx].replace(Assignment { note, on_at });
            self.voices[voice_idx].set_note(note);
            self.voices[voice_idx].set_gate(true);
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

            for cur in i..V {
                match self.assignments.get_mut(cur + 1) {
                    None | Some(None) => {
                        self.assignments[cur].take();
                        break;
                    }
                    Some(a @ Some(_)) => {
                        let assignment = a.take().unwrap();
                        self.assignments[cur].replace(assignment);
                    }
                }
            }
            // find and play top note, otherwise gate off if none
            let mut cur_note = None;
            for a in self.assignments.iter() {
                if let Some(Assignment { note, .. }) = a {
                    cur_note.replace(*note);
                }
            }
            if let Some(note) = cur_note {
                self.voices[0].set_note(note);
            } else {
                self.voices[0].set_gate(false);
            }
        } else {
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

            // Since gating a voice off leads into the release phase, the actual
            // freeing of the assignment takes place in `tick()` when we detect
            // the end of a release phase.
            self.voices[i].set_gate(false);
        }
    }

    pub fn spawn_new_grains(&mut self, sample: &Buffer, sample_rate: usize) {
        if self.mode == VoiceMode::Mono {
            self.voices[0].spawn_new_grains(sample, sample_rate);
        } else {
            for voice in self.voices.iter_mut() {
                voice.spawn_new_grains(sample, sample_rate);
            }
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
            // TODO(poly) - implement proper support for additional playheads.
            // Right now, playhead positions will be last-write-wins... is that
            // actually OK?
            //
            // Also, do we want to adjust gain in poly mode or globally to
            // account for clipping potential?
            for voice in self.voices.iter_mut() {
                voice.render_frame(sample, frame, playhead_positions);
            }
        }
    }

    pub fn tick(&mut self) {
        for (i, voice) in self.voices.iter_mut().enumerate() {
            let was_playing = voice.is_playing();
            voice.tick();
            if self.mode == VoiceMode::Poly && was_playing && !voice.is_playing() {
                self.assignments[i].take();
            }
        }
    }
}

#[derive(PartialEq)]
pub enum VoiceMode {
    Mono,
    Poly,
}

#[derive(Clone)]
struct Assignment {
    note: u32,
    on_at: u64,
}
