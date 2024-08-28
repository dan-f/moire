use std::{cell::RefCell, rc::Rc, u32};

use fraction::{GenericFraction, Zero};

type F = GenericFraction<u32>;

/// Sample-accurate clock
pub struct Clock {
    /// Whether ticking the clock has any effect
    enabled: bool,
    /// Samples per second
    sample_rate: usize,
    /// Beats per minute
    bpm: u32,
    /// Sample counter
    i: F,
    /// The ideal (sub) sample distance between beats
    beat_dist: F,
    /// The next ideal (sub) sample we should beat on
    next_beat: F,
    /// Clocks synced to this one
    children: Vec<Rc<RefCell<Clock>>>,
}

impl Clock {
    pub fn new(sample_rate: usize, bpm: u32) -> Self {
        let beat_dist = F::new((sample_rate as u32) * 60, bpm);
        Self {
            enabled: true,
            sample_rate,
            bpm,
            i: F::zero(),
            beat_dist,
            next_beat: beat_dist,
            children: vec![],
        }
    }

    pub fn new_child(&self, subdivision: u32) -> Self {
        let bpm = self.bpm * subdivision;
        let beat_dist = F::new((self.sample_rate as u32) * 60, bpm);
        Clock {
            enabled: false,
            sample_rate: self.sample_rate,
            bpm,
            i: F::zero(),
            beat_dist,
            next_beat: beat_dist,
            children: vec![],
        }
    }

    pub fn is_beat(&self) -> bool {
        self.enabled && self.i <= self.next_beat && self.next_beat < (self.i + 1)
    }

    pub fn tick(&mut self) {
        self.tick_as_child(false);
    }

    fn tick_as_child(&mut self, is_parent_beat: bool) {
        if is_parent_beat && !self.enabled {
            self.enabled = true;
            self.i = F::zero();
            self.next_beat = self.beat_dist;
        }

        if !self.enabled {
            return;
        }

        let is_beat = self.is_beat();
        if is_beat {
            let dist_from_zero = self.i;
            self.i = F::zero();
            self.next_beat = self.next_beat - dist_from_zero + self.beat_dist;
        }

        self.i += 1;

        for child in self.children.iter() {
            child.borrow_mut().tick_as_child(is_beat);
        }
    }

    pub fn add_child(&mut self, subdivision: u32) -> Rc<RefCell<Clock>> {
        let child = Rc::new(RefCell::new(self.new_child(subdivision)));
        self.children.push(Rc::clone(&child));
        child
    }
}
