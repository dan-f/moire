use crate::{buffer::StereoBuffer, dsp, env::Env};

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Grain {
    /// Identifier of the parent stream in its pool
    stream_idx: usize,
    /// Starting sub-sample index
    start: f32,
    /// Ending sub-sample index (inclusive)
    end: f32,
    /// Sub-sample value to increment the offset by
    incr: f32,
    /// Sub-sample offset position from `start`
    i: f32,
    /// Gain value
    gain: f32,
    /// Pan position (0 = left, 1 = right)
    pan: f32,
    /// Gain envelope
    env: Env,
}

impl Grain {
    pub fn new(
        stream_idx: usize,
        start: f32,
        end: f32,
        incr: f32,
        gain: f32,
        pan: f32,
        env: Env,
    ) -> Self {
        Self {
            stream_idx,
            start,
            end,
            incr,
            i: 0.,
            gain,
            pan,
            env,
        }
    }

    pub fn stream_idx(&self) -> usize {
        self.stream_idx
    }

    pub fn normalized_pos(&self, buf: &StereoBuffer) -> f32 {
        if let Some(idx) = self.idx() {
            idx / (buf.len as f32)
        } else {
            -1.
        }
    }

    pub fn render_frame(&self, sample: &StereoBuffer) -> [f32; 2] {
        let mut frame = if let Some(idx) = self.idx() {
            sample.sub_frame(idx)
        } else {
            return [0., 0.];
        };
        let gain = self.gain * self.env.at(self.pos());
        dsp::pan_stereo_frame(&mut frame, self.pan);
        dsp::gain_frame(&mut frame, gain);
        frame
    }

    pub fn tick(&mut self) -> bool {
        if let Some(_) = self.idx() {
            self.i += self.incr;
        }
        self.alive()
    }

    pub fn alive(&self) -> bool {
        self.idx().is_some()
    }

    fn idx(&self) -> Option<f32> {
        let idx = self.start + self.i;
        if idx > self.end {
            None
        } else {
            Some(idx)
        }
    }

    fn pos(&self) -> f32 {
        if self.alive() {
            self.i / (self.end - self.start)
        } else {
            1.
        }
    }
}

#[cfg(test)]
mod tests {
    use std::vec;

    use crate::buffer::StereoBuffer;

    use super::*;

    impl StereoBuffer {
        fn new_from(len: usize, data: [Vec<f32>; 2]) -> Self {
            Self {
                sample_rate: 48000,
                len,
                data,
            }
        }
    }

    #[test]
    fn playback() {
        let data = [vec![0.1, 0.2, 0.3], vec![0.1, 0.2, 0.3]];
        let buf = StereoBuffer::new_from(data[0].len(), data);
        let mut grain = Grain::new(0, 1., 2., 1., 1., 0.5, Env::None);

        assert!(grain.alive());

        assert_ne!([0., 0.], grain.render_frame(&buf));
        grain.tick();
        assert_ne!([0., 0.], grain.render_frame(&buf));

        grain.tick();
        assert_eq!([0., 0.], grain.render_frame(&buf));
        grain.tick();
        assert_eq!([0., 0.], grain.render_frame(&buf));

        assert!(!grain.alive());
    }
}
