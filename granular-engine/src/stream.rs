use std::{cell::RefCell, rc::Rc};

use crate::{buffer::StereoBuffer, clock::Clock, grain::Grain, tuning::tune_equal};

static mut NEXT_ID: usize = 1;

fn next_id() -> usize {
    unsafe {
        let id = NEXT_ID;
        NEXT_ID += 1;
        id
    }
}

pub struct Stream {
    id: usize,
    clock: Rc<RefCell<Clock>>,
    grain_start: f32,
    grain_size_ms: usize,
    tune: i32,
    pan: f32,
}

impl Stream {
    pub fn new(
        parent_clock: Rc<RefCell<Clock>>,
        subdivision: u32,
        grain_start: f32,
        grain_size_ms: usize,
        tune: i32,
        pan: f32,
    ) -> Self {
        Self {
            id: next_id(),
            clock: parent_clock.borrow_mut().add_child(subdivision),
            grain_start,
            grain_size_ms,
            tune,
            pan,
        }
    }

    pub fn id(&self) -> usize {
        self.id
    }

    pub fn try_create_grain(&self, sample: &StereoBuffer) -> Option<Grain> {
        if self.clock.borrow().is_beat() {
            let i = sample.len as f32 * self.grain_start;
            let len = (sample.sample_rate as f32 / 1000.) * self.grain_size_ms as f32;
            let end = f32::min(sample.len as f32, i + len);
            let incr = tune_equal(1., self.tune);
            Some(Grain::new(i, end, incr, self.pan))
        } else {
            None
        }
    }
}
