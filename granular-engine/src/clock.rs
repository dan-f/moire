use std::{cell::RefCell, rc::Rc, u32};

use num_rational::Rational64 as F;

/// Sample-accurate clock
#[derive(Debug)]
pub struct Clock {
    /// Whether ticking the clock has any effect
    enabled: bool,
    /// Samples per second
    sample_rate: usize,
    /// Beats per minute
    bpm: u32,
    /// Subdivision of the BPM
    subdivision: u32,
    /// Sample counter
    i: F,
    /// The ideal (sub) sample distance between beats
    beat_dist: F,
    /// The next ideal (sub) sample we should beat on
    next_beat: F,
    // /// Clocks synced to this one
    children: Vec<Rc<RefCell<Clock>>>,
}

impl Clock {
    pub fn new(sample_rate: usize, bpm: u32) -> Self {
        Self {
            enabled: true,
            sample_rate,
            bpm,
            subdivision: 1,
            i: F::ZERO,
            beat_dist: Self::calc_beat_dist(sample_rate, bpm, 1),
            next_beat: F::ZERO,
            children: vec![],
        }
    }

    pub fn is_beat(&self) -> bool {
        self.enabled && self.i <= self.next_beat && self.next_beat < (self.i + 1)
    }

    pub fn add_child(&mut self, subdivision: u32) -> Rc<RefCell<Clock>> {
        let child = Rc::new(RefCell::new(self.new_child(subdivision)));
        self.children.push(Rc::clone(&child));
        child
    }

    pub fn set_bpm(&mut self, bpm: u32) {
        let new_beat_dist = Self::calc_beat_dist(self.sample_rate, bpm, self.subdivision);
        let last_downbeat = (self.i / new_beat_dist).floor() * new_beat_dist;

        self.bpm = bpm;
        self.i -= last_downbeat;
        self.beat_dist = new_beat_dist;
        self.next_beat = last_downbeat + new_beat_dist;

        for child in self.children.iter_mut() {
            child.borrow_mut().set_bpm(bpm);
        }
    }

    pub fn tick(&mut self) {
        self.tick_as_child(false);
    }

    fn new_child(&self, subdivision: u32) -> Self {
        let beat_dist = Self::calc_beat_dist(self.sample_rate, self.bpm, subdivision);
        Clock {
            enabled: false,
            sample_rate: self.sample_rate,
            bpm: self.bpm,
            subdivision,
            i: F::ZERO,
            beat_dist,
            next_beat: beat_dist,
            children: vec![],
        }
    }

    fn tick_as_child(&mut self, is_parent_beat: bool) {
        if is_parent_beat && !self.enabled {
            self.enabled = true;
            self.i = F::ZERO;
            self.next_beat = self.beat_dist;
        }

        if !self.enabled {
            return;
        }

        let is_beat = self.is_beat();
        if is_beat {
            let dist_from_zero = self.i;
            self.i = F::ZERO;
            self.next_beat = self.next_beat - dist_from_zero + self.beat_dist;
        }

        self.i += 1;

        for child in self.children.iter() {
            child.borrow_mut().tick_as_child(is_beat);
        }
    }

    fn calc_beat_dist(sample_rate: usize, bpm: u32, subdivision: u32) -> F {
        F::new(sample_rate as i64 * 60, (bpm * subdivision) as i64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_single_clock() {
        let mut c = Clock::new(10, 180);
        let expected_beats = [0, 3, 6, 10, 13, 16, 20];
        for i in 0..=20 {
            let is_beat = c.is_beat();
            assert_eq!(
                expected_beats.contains(&i),
                is_beat,
                "Expected beat status of {} to be {}",
                i,
                is_beat
            );
            c.tick();
        }
    }
}
