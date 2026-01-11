use std::{
    cell::RefCell,
    rc::{Rc, Weak},
};

use crate::time::phasor::Phasor;

pub struct Clock {
    ticking: bool,
    phasor: Phasor,
    parent: Weak<RefCell<Clock>>,
    children: Vec<Rc<RefCell<Clock>>>,
}

impl Clock {
    pub fn new(phasor: Phasor) -> Self {
        Self {
            ticking: false,
            parent: Weak::new(),
            phasor,
            children: vec![],
        }
    }

    pub fn stop(&mut self) {
        self.ticking = false;
        self.phasor.t = 0.;
        for child in &self.children {
            child.borrow_mut().stop();
        }
    }

    pub fn resume(&mut self) {
        self.ticking = true;
        for child in &self.children {
            child.borrow_mut().resume();
        }
    }

    pub fn tick(&mut self) {
        if !self.ticking {
            return;
        }
        self.phasor.tick();
        for child in &self.children {
            child.borrow_mut().tick();
        }
    }

    pub fn is_zero(&self) -> bool {
        self.ticking && self.phasor.is_zero()
    }

    pub fn set_freq(&mut self, freq: f64) {
        self.scale_freq(freq / self.phasor.freq());
    }

    pub fn scale_freq(&mut self, factor: f64) {
        self.phasor.scale_freq(factor);
        for child in &self.children {
            child.borrow_mut().scale_freq(factor);
        }
    }

    pub fn subdivide(&mut self, subdivision: f64) {
        let parent = if let Some(p) = self.parent.upgrade() {
            p
        } else {
            return;
        };
        let parent = parent.borrow();
        let ticks_since_parent_zero = parent.phasor.t / parent.phasor.dt;
        let prv_dt = self.phasor.dt;
        self.phasor.dt = parent.phasor.dt * subdivision;
        self.phasor.t = (ticks_since_parent_zero * self.phasor.dt) % 1.;
        for child in &self.children {
            let mut child = child.borrow_mut();
            let child_subdivision = child.phasor.dt / prv_dt;
            child.subdivide(child_subdivision);
        }
    }
}

pub fn new_clock(sample_rate: usize, freq: f64) -> Rc<RefCell<Clock>> {
    Rc::new(RefCell::new(Clock::new(Phasor::new(sample_rate, freq))))
}

pub fn add_child(parent: &Rc<RefCell<Clock>>) -> Rc<RefCell<Clock>> {
    let mut parent_mut = parent.borrow_mut();
    let phasor = parent_mut.phasor;
    let child = Rc::new(RefCell::new(Clock::new(phasor)));
    child.borrow_mut().parent = Rc::downgrade(parent);
    parent_mut.children.push(Rc::clone(&child));
    child
}

#[cfg(test)]
mod tests {
    use crate::time::{
        clock::{add_child, new_clock},
        phasor::Phasor,
    };

    use super::Clock;

    #[test]
    fn single_parent() {
        let mut clock: Clock = Clock::new(Phasor::new(8, 1.));

        assert!(!clock.is_zero()); // clock is not zero until we have resumed
        clock.tick();
        assert!(!clock.is_zero()); // still not zero

        clock.resume();
        assert!(clock.is_zero());
        clock.tick();
        assert!(!clock.is_zero());

        for _ in 0..7 {
            clock.tick();
        }
        print!("phasor t={}", clock.phasor.t);
        assert!(clock.is_zero());
    }

    #[test]
    fn subdividing_child() {
        let parent = new_clock(8, 1.);
        let child = add_child(&parent);
        child.borrow_mut().subdivide(2.);
        parent.borrow_mut().resume();

        assert!(parent.borrow().is_zero());
        assert!(child.borrow().is_zero());

        parent.borrow_mut().tick();
        assert!(!parent.borrow().is_zero());
        assert!(!child.borrow().is_zero());

        for _ in 0..3 {
            parent.borrow_mut().tick();
        }
        assert!(!parent.borrow().is_zero());
        assert!(child.borrow().is_zero());

        for _ in 0..4 {
            parent.borrow_mut().tick();
        }
        assert!(parent.borrow().is_zero());
        assert!(child.borrow().is_zero());
    }

    #[test]
    fn subdivide_mid_cycle() {
        let parent = new_clock(8, 1.);
        let child = add_child(&parent);
        parent.borrow_mut().resume();

        assert!(parent.borrow().is_zero());
        assert!(child.borrow().is_zero());

        for _ in 0..4 {
            parent.borrow_mut().tick();
        }
        assert!(!parent.borrow().is_zero());
        assert!(!child.borrow().is_zero());

        child.borrow_mut().subdivide(2.);
        assert!(!parent.borrow().is_zero());
        assert!(child.borrow().is_zero());

        for _ in 0..4 {
            parent.borrow_mut().tick();
        }
        assert!(parent.borrow().is_zero());
        assert!(child.borrow().is_zero());
    }

    #[test]
    fn set_freq() {
        let parent = new_clock(16, 1.);
        let child = add_child(&parent);
        child.borrow_mut().subdivide(2.);
        parent.borrow_mut().resume();

        assert!(parent.borrow().is_zero());
        assert!(child.borrow().is_zero());

        for _ in 0..2 {
            parent.borrow_mut().tick();
        }
        assert!(!parent.borrow().is_zero());
        assert!(!child.borrow().is_zero());

        parent.borrow_mut().set_freq(2.);
        assert!(!parent.borrow().is_zero());
        assert!(!child.borrow().is_zero());

        for _ in 0..3 {
            parent.borrow_mut().tick();
        }
        assert!(!parent.borrow().is_zero());
        assert!(child.borrow().is_zero());

        for _ in 0..4 {
            parent.borrow_mut().tick();
        }
        assert!(parent.borrow().is_zero());
        assert!(child.borrow().is_zero());
    }

    #[test]
    fn stop_and_resume() {
        let parent = new_clock(8, 1.);
        let child = add_child(&parent);
        child.borrow_mut().subdivide(2.);

        // we are initially stopped
        assert!(!parent.borrow().is_zero());
        assert!(!child.borrow().is_zero());
        parent.borrow_mut().tick();
        assert!(!parent.borrow().is_zero());
        assert!(!child.borrow().is_zero());

        // get halfway through cycle; child is at a crossing, parent is not
        parent.borrow_mut().resume();
        assert!(parent.borrow().is_zero());
        assert!(child.borrow().is_zero());
        for _ in 0..4 {
            parent.borrow_mut().tick();
        }
        assert!(!parent.borrow().is_zero());
        assert!(child.borrow().is_zero());

        // stop an resume the parent; both are back to the zero crossing
        parent.borrow_mut().stop();
        assert!(!parent.borrow().is_zero());
        assert!(!child.borrow().is_zero());
        parent.borrow_mut().resume();
        assert!(parent.borrow().is_zero());
        assert!(child.borrow().is_zero());
    }
}
