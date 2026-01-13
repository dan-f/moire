use std::array;

use num_rational::Rational64;

use crate::{
    buffer::Buffer,
    env::Env,
    time::clock::{self},
    voice::Voice,
};

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
        // TODO refactor these into an AdsrParams struct or something
        attack: usize,
        decay: usize,
        sustain: f32,
        release: usize,
        clock_freq: Rational64,
        sample_rate: usize,
    ) -> Self {
        let voices = array::from_fn(|_| {
            Voice::new(
                clock::new_clock(sample_rate, clock_freq),
                attack,
                decay,
                sustain,
                release,
            )
        });
        Self {
            mode,
            voices,
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

    pub fn set_lead_clock_freqs(&mut self, freq: Rational64) {
        for voice in &mut self.voices {
            voice.set_lead_clock_freq(freq);
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

    pub fn subdivide_stream_clock(&mut self, stream_id: usize, subdivision: Rational64) {
        for voice in self.voices.iter_mut() {
            voice.subdivide_stream_clock(stream_id, subdivision);
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
            let entry = self.mono_assignments().find(|(_, a)| a.is_none());
            if let Some((i, assignment)) = entry {
                assignment.replace(Assignment { note, on_at });
                self.voices[0].set_note(note);
                if i == 0 {
                    self.voices[0].set_gate(true);
                    self.voices[0].resume_lead_clock();
                }
            }
        } else {
            let mut min_age = u64::MAX;
            let mut entry = None;
            for (voice, assignment) in self.poly_voice_assignments() {
                if let Some(Assignment { on_at, .. }) = assignment {
                    if *on_at <= min_age {
                        min_age = *on_at;
                        entry.replace((voice, assignment));
                    }
                } else {
                    entry.replace((voice, assignment));
                    break;
                }
            }
            if let Some((voice, assignment)) = entry {
                assignment.replace(Assignment { note, on_at });
                voice.set_note(note);
                voice.set_gate(true);
                voice.resume_lead_clock();
            }
        }
    }

    pub fn note_off(&mut self, note: u32) {
        if self.mode == VoiceMode::Mono {
            // TODO I think this is buggy. `i` could be zero which would crash
            // us out. Furthermore, why we we immediately de-assign the last

            // find matching pseudo-voice to de-assign
            let i = self.mono_assignments().find_map(|(i, a)| {
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

            // pull the assignment from the stack, finding the top pseudo-voice
            let mut top = (i as isize) - 1;
            for cur in i..V {
                match self.assignments.get_mut(cur + 1) {
                    None | Some(None) => {
                        self.assignments[cur].take();
                        break;
                    }
                    Some(a @ Some(_)) => {
                        let assignment = a.take().unwrap();
                        self.assignments[cur].replace(assignment);
                        top += 1;
                    }
                }
            }

            // play the top pseudo-voice, if any
            if let Some(Some(Assignment { note: top_note, .. })) =
                self.assignments.get(top as usize)
            {
                self.voices[0].set_note(*top_note);
            } else {
                // Enter the release phase.
                self.voices[0].set_gate(false);
            }
        } else {
            let voice = self
                .poly_voice_assignments()
                .find_map(|(voice, assignment)| {
                    if assignment.as_mut().is_some_and(|a| a.note == note)
                        && !voice.adsr.is_release()
                    {
                        Some(voice)
                    } else {
                        None
                    }
                });
            if let Some(voice) = voice {
                // Since gating a voice off leads into the release phase, the actual
                // freeing of the assignment takes place in `tick()` when we detect
                // the end of a release phase.
                voice.set_gate(false);
            }
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
            let was_playing = voice.adsr.is_open();
            voice.tick();
            if was_playing && !voice.adsr.is_open() {
                voice.stop_lead_clock();
                // TODO why only in poly mode?
                if self.mode == VoiceMode::Poly {
                    self.assignments[i].take();
                }
            }
        }
    }

    fn mono_assignments(&mut self) -> impl Iterator<Item = (usize, &mut Option<Assignment>)> {
        self.assignments.iter_mut().enumerate()
    }

    fn poly_voice_assignments(
        &mut self,
    ) -> impl Iterator<Item = (&mut Voice<S>, &mut Option<Assignment>)> {
        self.voices.iter_mut().zip(self.assignments.iter_mut())
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
