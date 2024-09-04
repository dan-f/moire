use crate::{buffer::StereoBuffer, dsp};

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Grain {
    /// Starting sub-sample index
    start: f32,
    /// Ending sub-sample index (inclusive)
    end: f32,
    /// Sub-sample value to increment the offset by
    incr: f32,
    /// Sub-sample offset position from `start`
    i: f32,
    /// Pan position (0 = left, 1 = right)
    pan: f32,
}

impl Grain {
    pub fn new(start: f32, end: f32, incr: f32, pan: f32) -> Self {
        Self {
            start,
            end,
            incr,
            i: 0.,
            pan,
        }
    }

    pub fn render_frame(&self, sample: &StereoBuffer) -> [f32; 2] {
        let frame = if let Some(idx) = self.idx() {
            sample.sub_frame(idx)
        } else {
            return [0., 0.];
        };
        dsp::pan_stereo_frame(&frame, self.pan)
    }

    pub fn tick(&mut self) -> bool {
        if let Some(_) = self.idx() {
            self.i += self.incr;
        }
        self.alive()
    }

    pub fn complete(&mut self) {
        if let Some(_) = self.idx() {
            self.i = self.end + 1.;
        }
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
}

impl Default for Grain {
    /// Build a grain which is not alive
    fn default() -> Self {
        Self {
            start: 0.,
            end: 0.,
            incr: 0.,
            i: 1.,
            pan: 0.5,
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
    fn test_playback() {
        let data = [vec![0.1, 0.2, 0.3], vec![0.1, 0.2, 0.3]];
        let buf = StereoBuffer::new_from(data[0].len(), data);
        let mut grain = Grain::new(1., 2., 1., 0.5);

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
