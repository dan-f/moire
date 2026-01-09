pub struct Phasor {
    /// phase
    t: f64,
    /// per-sample phase increment
    dt: f64,
    sample_rate: f64,
}

impl Phasor {
    /// Create a phasor
    ///
    /// # Panics
    ///
    /// Panics if `freq` exceeds the nyquist frequency
    pub fn new(sample_rate: usize, freq: f64) -> Self {
        let sample_rate = sample_rate as f64;

        assert!(freq < sample_rate / 2.);

        Self {
            dt: freq / sample_rate,
            t: 0.,
            sample_rate,
        }
    }

    /// Return whether the current phasor position is a "crossing". This will
    /// only be true on one moment per cycle, and it will be considered true
    /// when the position on the prior tick was greater than the position on the
    /// current tick.
    pub fn is_cross(&self) -> bool {
        self.t - self.dt < 0.
    }

    /// Advance the phasor
    pub fn tick(&mut self) {
        self.t += self.dt;
        if self.t >= 1. {
            self.t -= 1.;
        }
    }

    /// Update the phasor's frequency without effecting phase
    ///
    /// # Panics
    ///
    /// Panics if `freq` exceeds the nyquist frequency
    pub fn set_freq(&mut self, freq: f64) {
        assert!(freq < self.sample_rate / 2.);
        self.dt = freq / self.sample_rate;
    }

    /// Scale the phasor's frequency without effecting phase
    ///
    /// # Panics
    ///
    /// Panics if the updated frequency would exceed the nyquist frequency
    pub fn scale_freq(&mut self, factor: f64) {
        let cur_freq = self.dt / (1. / self.sample_rate);
        assert!(cur_freq < self.sample_rate / 2.);
        self.dt *= factor;
    }
}

pub fn bpm_to_freq(bpm: u32) -> f64 {
    bpm as f64 / 60.
}

#[cfg(test)]
mod tests {
    use crate::timing_v2::Phasor;

    #[test]
    fn phasor_complete_cycle() {
        let mut p = Phasor::new(10, 2.);
        assert_eq!(0., p.t);
        assert!(p.is_cross());

        for _ in 0..4 {
            p.tick();
            assert!(!p.is_cross());
        }

        p.tick();
        assert_eq!(0., p.t);
        assert_eq!(0., p.t);
        assert!(p.is_cross());
    }

    #[test]
    fn phasor_set_freq() {
        let mut p = Phasor::new(10, 1.);
        assert_eq!(0., p.t);
        assert_eq!(0.1, p.dt);

        for _ in 0..6 {
            p.tick();
        }

        assert_eq!(0.6, p.t);

        p.set_freq(2.);
        assert_eq!(0.6, p.t);
        assert_eq!(0.2, p.dt);
        for _ in 0..2 {
            p.tick();
        }
        assert_eq!(0., p.t);
    }

    #[test]
    fn phasor_scale_freq() {
        let mut p = Phasor::new(8, 1.);
        assert_eq!(0., p.t);
        assert_eq!(0.125, p.dt);

        for _ in 0..2 {
            p.tick();
        }

        assert_eq!(0.25, p.t);

        p.scale_freq(2.);
        assert_eq!(0.25, p.t);
        assert_eq!(0.25, p.dt);
        for _ in 0..3 {
            p.tick();
        }
        assert_eq!(0., p.t);
    }
}
