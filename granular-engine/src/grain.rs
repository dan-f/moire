use crate::buffer::StereoBuffer;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Grain {
    /// Starting sample index
    start: usize,
    /// Number of samples
    len: usize,
    /// Playhead
    i: usize,
}

impl Grain {
    pub fn new(start: usize, len: usize) -> Self {
        Self { start, len, i: 0 }
    }

    pub fn render_frame(&self, sample: &StereoBuffer) -> [f32; 2] {
        if let Some(idx) = self.idx() {
            // TODO make sure we don't go off the end. Avoid creating grains
            // where given the start + length, they'd run off the end.
            sample.frame(idx)
        } else {
            [0., 0.]
        }
    }

    pub fn tick(&mut self) -> bool {
        if let Some(_) = self.idx() {
            self.i += 1;
        }
        self.alive()
    }

    pub fn alive(&self) -> bool {
        self.idx().is_some()
    }

    fn idx(&self) -> Option<usize> {
        let idx = self.start + self.i;
        if idx > self.final_idx() {
            None
        } else {
            Some(idx)
        }
    }

    fn final_idx(&self) -> usize {
        self.start + self.len - 1
    }
}

#[cfg(test)]
mod tests {
    use std::vec;

    use crate::buffer::StereoBuffer;

    use super::*;

    #[test]
    fn test_playback() {
        let data = [vec![0.1, 0.2, 0.3], vec![0.1, 0.2, 0.3]];
        let buf = StereoBuffer::new_from(data[0].len(), data);
        let mut grain = Grain::new(1, 2);

        assert!(grain.alive());

        assert_eq!([0.2, 0.2], grain.render_frame(&buf));
        grain.tick();
        assert_eq!([0.3, 0.3], grain.render_frame(&buf));

        grain.tick();
        assert_eq!([0., 0.], grain.render_frame(&buf));
        grain.tick();
        assert_eq!([0., 0.], grain.render_frame(&buf));

        assert!(!grain.alive());
    }
}
