use std::{
    cell::RefCell,
    rc::{Rc, Weak},
};

use num_rational::Rational64 as Real;

#[derive(Debug)]
struct RealPhasor {
    /// Incrementing real value from 0..1 that wraps around
    t: Real,
    /// Increment value as frequency / sample_rate
    dt: Real,
    sample_rate: i64,
}

impl RealPhasor {
    pub fn new<N: Into<Real>>(sample_rate: i64, freq: N) -> RealPhasor {
        RealPhasor {
            t: Real::ZERO,
            dt: freq.into() / sample_rate,
            sample_rate,
        }
    }

    pub fn reset(&mut self, new_freq: Real, new_phase: Real) {
        self.dt = new_freq / self.sample_rate;
        self.t = new_phase;
    }

    pub fn phase(&self) -> Real {
        self.t
    }

    pub fn freq(&self) -> Real {
        self.dt * (self.sample_rate as i64)
    }

    pub fn sample_rate(&self) -> i64 {
        self.sample_rate
    }

    pub fn tick(&mut self) {
        self.t = (self.t + self.dt) % Real::ONE
    }

    pub fn is_cross(&self) -> bool {
        self.phase() == Real::ZERO || self.t + self.dt > Real::ONE
    }
}

/// Sample-accurate clock
#[derive(Debug)]
pub struct Clock {
    phasor: RealPhasor,
    parent: Weak<RefCell<Clock>>,
    children: Vec<Rc<RefCell<Clock>>>,
}

impl Clock {
    pub fn new<N: Into<Real>>(sample_rate: usize, freq: N) -> Self {
        Self {
            phasor: RealPhasor::new(sample_rate as i64, freq),
            parent: Weak::new(),
            children: vec![],
        }
    }

    pub fn add_child<N: Into<Real>>(
        parent: &Rc<RefCell<Self>>,
        subdivision: N,
    ) -> Rc<RefCell<Clock>> {
        let subdivision: Real = subdivision.into();
        let mut p = parent.borrow_mut();
        let mut child = Self::new(
            p.phasor.sample_rate() as usize,
            p.phasor.freq() * subdivision,
        );

        child.parent = Rc::downgrade(parent);
        child.phasor.reset(
            child.phasor.freq(),
            calc_new_phase(p.phasor.phase(), subdivision),
        );

        let rc = Rc::new(RefCell::new(child));
        p.children.push(Rc::clone(&rc));
        rc
    }

    pub fn is_beat(&self) -> bool {
        self.phasor.is_cross()
    }

    pub fn tick(&mut self) {
        self.phasor.tick();

        for child in self.children.iter() {
            child.borrow_mut().tick();
        }
    }

    pub fn set_freq<N: Into<Real>>(&mut self, new_freq: N) {
        let new_freq: Real = new_freq.into();
        // You may not directly update the frequency of a child clock.
        // Instead update via `.set_subdivision()`
        if self.parent.upgrade().is_some() {
            return;
        }

        let old_freq = self.phasor.freq();
        let old_phase = self.phasor.phase();
        let subdivision = new_freq / old_freq;
        let new_phase = calc_new_phase(old_phase, subdivision);

        self.phasor.reset(new_freq, new_phase);

        for child in self.children.iter_mut() {
            let mut child = child.borrow_mut();
            let child_freq = child.phasor.freq();
            let child_subdivision = child_freq / old_freq;
            child.do_set_subdivision(child_subdivision, self.phasor.freq(), self.phasor.phase());
        }
    }

    pub fn set_subdivision<N: Into<Real>>(&mut self, subdivision: N) {
        let subdivision: Real = subdivision.into();
        let (parent_freq, parent_phase) = if let Some(parent) = self.parent.upgrade() {
            let parent = parent.borrow();
            (parent.phasor.freq(), parent.phasor.phase())
        } else {
            // This will only happen if we accidently try to set the subdivision
            // of a root clock, or otherwise have a bug in our code.
            return;
        };

        self.do_set_subdivision(subdivision, parent_freq, parent_phase);
    }

    fn do_set_subdivision(&mut self, subdivision: Real, parent_freq: Real, parent_phase: Real) {
        let old_freq = self.phasor.freq();
        let new_freq = parent_freq * subdivision;

        let new_phase = calc_new_phase(parent_phase, subdivision);
        self.phasor.reset(new_freq, new_phase);

        for child in self.children.iter_mut() {
            let mut child = child.borrow_mut();
            let child_freq = child.phasor.freq();
            let child_subdivision = child_freq / old_freq;
            child.do_set_subdivision(child_subdivision, self.phasor.freq(), self.phasor.phase());
        }
    }
}

pub fn bpm_to_freq(bpm: u32) -> Real {
    Real::new(bpm as i64, 60)
}

/// Given a current phase position and a new subdivision, calculate the
/// phase we ought to be at.
///
/// E.g. if the current phase is 75% through a cycle and the new subdivision
/// is 2, we ought to be at 50% phase now.
fn calc_new_phase(current_phase: Real, subdivision: Real) -> Real {
    (current_phase * subdivision).fract()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_phasor() {
        let mut p = RealPhasor::new(10, 3);
        let expected_crossings = [0, 3, 6, 10, 13, 16, 20];
        for i in 0..=20 {
            assert_eq!(
                expected_crossings.contains(&i),
                p.is_cross(),
                "Expected phasor to cross on {} ticks",
                i,
            );
            p.tick();
        }
    }

    #[test]
    fn test_single_clock() {
        let mut c = Clock::new(10, 3);
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

    #[test]
    fn test_parent_child_clocks() {
        let c1 = Rc::new(RefCell::new(Clock::new(10, 1)));
        let c2 = Clock::add_child(&c1, 2);
        let c3 = Clock::add_child(&c1, 3);

        let c1_expected_beats = [0, 10];
        let c2_expected_beats = [0, 5, 10];
        let c3_expected_beats = [0, 3, 6, 10];

        for i in 0..=10 {
            let mut c1 = c1.borrow_mut();
            assert_eq!(c1_expected_beats.contains(&i), c1.is_beat());
            assert_eq!(c2_expected_beats.contains(&i), c2.borrow_mut().is_beat());
            assert_eq!(c3_expected_beats.contains(&i), c3.borrow_mut().is_beat());
            c1.tick();
        }
    }

    #[test]
    fn test_set_parent_freq() {
        let mut c = Clock::new(10, 1);
        assert!(c.is_beat());

        c.tick(); // 1
        c.tick(); // 2
        c.tick(); // 3
        c.tick(); // 4
        assert!(!c.is_beat());

        c.set_freq(2);
        assert!(!c.is_beat());
        c.tick(); // 5
        assert!(c.is_beat());
    }

    #[test]
    fn test_set_child_freq() {
        let parent = Rc::new(RefCell::new(Clock::new(10, 1)));
        parent.borrow_mut().tick();

        let child = Clock::add_child(&parent, 2);
        assert!(!child.borrow().is_beat());
        child.borrow_mut().set_freq(10);

        assert!(!child.borrow().is_beat());
        parent.borrow_mut().tick();
        assert!(!child.borrow().is_beat());
    }

    #[test]
    fn test_set_parent_subdivision() {
        let root = Rc::new(RefCell::new(Clock::new(10, 1)));
        let parent = Clock::add_child(&root, 1);
        let child = Clock::add_child(&parent, 2);

        root.borrow_mut().tick(); // 1
        root.borrow_mut().tick(); // 2

        parent.borrow_mut().set_subdivision(2);
        assert!(!parent.borrow().is_beat());
        assert!(child.borrow().is_beat());

        root.borrow_mut().tick(); // 3
        root.borrow_mut().tick(); // 4
        root.borrow_mut().tick(); // 5
        assert!(parent.borrow().is_beat());
        assert!(child.borrow().is_beat());
    }
}
