use std::{cell::RefCell, cmp, rc::Rc};

use crate::{buffer::StereoBuffer, clock::Clock, grain::Grain};

pub struct Stream {
    clock: Rc<RefCell<Clock>>,
    grain_start: f32,
    grain_size_ms: usize,
}

impl Stream {
    pub fn new(
        parent_clock: Rc<RefCell<Clock>>,
        subdivision: u32,
        grain_start: f32,
        grain_size_ms: usize,
    ) -> Self {
        Self {
            clock: parent_clock.borrow_mut().add_child(subdivision),
            grain_start,
            grain_size_ms,
        }
    }

    pub fn try_create_grain(&self, sample: &StereoBuffer) -> Option<Grain> {
        if self.clock.borrow().is_beat() {
            let i = (sample.len as f32 * self.grain_start) as usize;
            let len = (sample.sample_rate / 1000) * self.grain_size_ms;
            let end = cmp::min(sample.len, i + len);
            Some(Grain::new(i, end))
        } else {
            None
        }
    }
}
