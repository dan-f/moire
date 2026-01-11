#[derive(Debug, Clone, Copy)]
pub struct Phasor {
    /// phase
    pub t: f64,
    /// per-sample phase increment
    pub dt: f64,
    pub sample_rate: f64,
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

    pub fn freq(&self) -> f64 {
        self.dt * self.sample_rate
    }

    /// Return whether the current phasor position is at a zero crossing. This
    /// will only be true on one moment per cycle, and it will be considered
    /// true when the position on the prior tick was greater than the position
    /// on the current tick.
    pub fn is_zero(&self) -> bool {
        self.t - self.dt < 0.
    }

    /// Advance the phasor
    pub fn tick(&mut self) {
        self.t += self.dt;
        if self.t >= 1. {
            self.t -= 1.;
        }
    }

    /// Synchronize this phasor to the subdivision of another phasor's
    /// frequency. Assumes both phasors are ticking at the same sample rate
    pub fn sync(&mut self, other: &Phasor, subdivision: f64) {
        self.dt = other.dt * subdivision;
        self.t = ((other.t / other.dt) * self.dt) % 1.;
    }

    /// Set the phasor's frequency without effecting phase
    ///
    /// # Panics
    ///
    /// Panics if the updated frequency would exceed the nyquist frequency
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

#[cfg(test)]
mod tests {
    use super::Phasor;

    #[test]
    fn phasor_complete_cycle() {
        let mut p = Phasor::new(10, 2.);
        assert_eq!(0., p.t);
        assert!(p.is_zero());

        for _ in 0..4 {
            p.tick();
            assert!(!p.is_zero());
        }

        p.tick();
        assert_eq!(0., p.t);
        assert_eq!(0., p.t);
        assert!(p.is_zero());
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
