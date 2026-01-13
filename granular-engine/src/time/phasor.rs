use num_rational::Rational64;

#[derive(Debug, Clone, Copy)]
pub struct Phasor {
    /// phase
    pub t: Rational64,
    /// per-sample phase increment
    pub dt: Rational64,
    pub sample_rate: i64,
}

impl Phasor {
    /// Create a phasor
    ///
    /// # Panics
    ///
    /// Panics if `freq` exceeds the nyquist frequency
    pub fn new(sample_rate: usize, freq: Rational64) -> Self {
        let sample_rate = sample_rate as i64;
        assert!(freq < Rational64::new(sample_rate, 2));

        Self {
            dt: freq / sample_rate,
            t: Rational64::ZERO,
            sample_rate,
        }
    }

    pub fn freq(&self) -> Rational64 {
        self.dt * self.sample_rate
    }

    /// Return whether the current phasor position is at a zero crossing. If we
    /// have inter-sample crosses, consider the later sample to be the zero
    /// crossing.
    pub fn is_zero(&self) -> bool {
        self.t < self.dt
    }

    /// Advance the phasor
    pub fn tick(&mut self) {
        self.t = (self.t + self.dt) % Rational64::ONE;
    }

    /// Scale the phasor's frequency without effecting phase
    ///
    /// # Panics
    ///
    /// Panics if the updated frequency would exceed the nyquist frequency
    pub fn scale_freq(&mut self, factor: Rational64) {
        let cur_freq = self.dt * self.sample_rate;
        assert!(cur_freq < Rational64::new(self.sample_rate, 2));
        self.dt *= factor;
    }
}

#[cfg(test)]
mod tests {
    use num_rational::Rational64;

    use super::Phasor;

    #[test]
    fn phasor_complete_cycle() {
        let mut p = Phasor::new(10, Rational64::ONE * 2);
        assert_eq!(Rational64::ZERO, p.t);
        assert!(p.is_zero());

        for _ in 0..4 {
            p.tick();
            assert!(!p.is_zero());
        }

        p.tick();
        assert_eq!(Rational64::ZERO, p.t);
        assert!(p.is_zero());
    }

    #[test]
    fn phasor_scale_freq() {
        let mut p = Phasor::new(8, Rational64::ONE);
        assert_eq!(Rational64::ZERO, p.t);
        assert_eq!(Rational64::new(1, 8), p.dt);

        for _ in 0..2 {
            p.tick();
        }

        assert_eq!(Rational64::new(1, 4), p.t);

        p.scale_freq(Rational64::ONE * 2);
        assert_eq!(Rational64::new(1, 4), p.t);
        assert_eq!(Rational64::new(1, 4), p.dt);
        for _ in 0..3 {
            p.tick();
        }
        assert_eq!(Rational64::ZERO, p.t);
    }

    #[test]
    fn fractional_dt() {
        let mut p = Phasor::new(48_000, Rational64::ONE * 7);
        assert_eq!(Rational64::ZERO, p.t);
        assert_eq!(Rational64::new(7, 48_000), p.dt);
        assert!(p.is_zero());

        for _ in 0..6858 {
            p.tick();
        }
        assert!(p.is_zero());

        for _ in 0..6 {
            for _ in 0..6857 {
                p.tick();
            }
            assert!(p.is_zero());
        }

        assert_eq!(Rational64::ZERO, p.t);
    }
}
