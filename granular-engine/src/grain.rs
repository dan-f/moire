use crate::buffer::StereoBuffer;

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
            sample.frame(idx)
        } else {
            [0., 0.]
        }
    }

    pub fn tick(&mut self) -> bool {
        if let Some(_) = self.idx() {
            self.i += 1;
            true
        } else {
            false
        }
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
