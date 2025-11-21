pub struct Adsr {
    attack: usize,
    decay: usize,
    sustain: f32,
    release: usize,
    phase: AdsrPhase,
}

impl Adsr {
    pub fn new(attack: usize, decay: usize, sustain: f32, release: usize) -> Self {
        Self {
            attack,
            decay,
            sustain,
            release,
            phase: AdsrPhase::Off,
        }
    }

    pub fn set_adsr(&mut self, attack: usize, decay: usize, sustain: f32, release: usize) {
        if attack == self.attack
            && decay == self.decay
            && sustain == self.sustain
            && release == self.release
        {
            return;
        }

        match self.phase {
            AdsrPhase::Attack { ref mut i } => {
                *i = ((*i as f32 / self.attack as f32) * attack as f32).round() as usize;
            }
            AdsrPhase::Decay { ref mut i } => {
                *i = ((*i as f32 / self.decay as f32) * decay as f32).round() as usize;
            }
            AdsrPhase::Release {
                ref mut start_gain,
                ref mut i,
            } => {
                *start_gain = sustain;
                *i = ((*i as f32 / self.release as f32) * release as f32).round() as usize;
            }
            _ => {}
        };

        self.attack = attack;
        self.decay = decay;
        self.sustain = sustain;
        self.release = release;
    }

    pub fn set_gate(&mut self, gate: bool) {
        // To avoid clicks when jumping from one phase to another (e.g. gate
        // closed during attack or gate opened during release), set the index of
        // the new phase to most closely reproduce the current gain value.
        if gate {
            let i = (self.gain() * self.attack as f32).round() as usize;
            self.phase = AdsrPhase::Attack { i };
        } else {
            if !self.is_open() {
                return;
            }
            if let AdsrPhase::Release {
                start_gain: _,
                i: _,
            } = self.phase
            {
                return;
            }

            let gain = self.gain();
            self.phase = if gain >= self.sustain {
                AdsrPhase::Release {
                    start_gain: gain,
                    i: 0,
                }
            } else {
                let i = ((1. - gain / self.sustain) * self.release as f32).round() as usize;
                AdsrPhase::Release {
                    start_gain: self.sustain,
                    i,
                }
            };
        }
    }

    pub fn tick(&mut self) {
        match self.phase {
            AdsrPhase::Attack { ref mut i } => {
                *i += 1;
                if *i >= self.attack {
                    self.phase = AdsrPhase::Decay { i: *i % self.decay }
                }
            }
            AdsrPhase::Decay { ref mut i } => {
                *i += 1;
                if *i >= self.decay {
                    self.phase = AdsrPhase::Sustain;
                }
            }
            AdsrPhase::Release {
                ref mut i,
                start_gain: _,
            } => {
                *i += 1;
                if *i >= self.release {
                    self.phase = AdsrPhase::Off;
                }
            }
            _ => {}
        };
    }

    pub fn gain(&self) -> f32 {
        match self.phase {
            AdsrPhase::Attack { i } => i as f32 / self.attack as f32,
            AdsrPhase::Decay { i } => 1. - (i as f32 / self.decay as f32) * (1. - self.sustain),
            AdsrPhase::Sustain => self.sustain,
            AdsrPhase::Release { start_gain, i } => {
                start_gain * (1. - i as f32 / self.release as f32)
            }
            AdsrPhase::Off => 0.,
        }
    }

    pub fn is_open(&self) -> bool {
        return self.phase != AdsrPhase::Off;
    }
}

#[derive(Debug, PartialEq)]
enum AdsrPhase {
    Off,
    Attack { i: usize },
    Decay { i: usize },
    Sustain,
    Release { start_gain: f32, i: usize },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gate_off_during_sustain() {
        let mut adsr = fixture();

        // off phase - cannot be ticked
        assert_eq!(0., adsr.gain());
        adsr.tick();
        assert_eq!(0., adsr.gain());

        // attack phase
        adsr.set_gate(true);
        assert_eq!(0., adsr.gain());
        adsr.tick();
        assert_eq!(0.1, adsr.gain());
        for _ in 0..9 {
            adsr.tick();
        }

        // decay phase
        assert_eq!(1., adsr.gain());
        adsr.tick();
        assert_eq!(0.95, adsr.gain());
        adsr.tick();
        assert_eq!(0.9, adsr.gain());
        adsr.tick();
        assert_eq!(0.85, adsr.gain());
        adsr.tick();
        assert_eq!(0.8, adsr.gain());
        adsr.tick();
        assert_eq!(0.75, adsr.gain());
        // ticking again does nothing
        adsr.tick();
        assert_eq!(0.75, adsr.gain());

        // release phase
        adsr.set_gate(false);
        assert_eq!(0.75, adsr.gain());
        adsr.tick();
        assert_eq!(0.7425, adsr.gain());
        for _ in 0..99 {
            adsr.tick();
        }
        assert_eq!(0., adsr.gain());

        // off phase again
        adsr.tick();
        assert_eq!(0., adsr.gain());
    }

    #[test]
    fn gate_off_during_attack() {
        let mut adsr = fixture();

        adsr.set_gate(true);
        for _ in 0..5 {
            adsr.tick();
        }
        assert_eq!(0.5, adsr.gain());

        adsr.set_gate(false);
        assert_eq!(0.50249994, adsr.gain());
        adsr.tick();
        assert_eq!(0.49499997, adsr.gain());
        for _ in 0..99 {
            adsr.tick();
        }
        assert_eq!(0., adsr.gain());
    }

    #[test]
    fn gate_off_during_decay() {
        let mut adsr = fixture();

        adsr.set_gate(true);
        for _ in 0..10 {
            adsr.tick();
        }
        assert_eq!(1., adsr.gain());

        for _ in 0..3 {
            adsr.tick();
        }
        assert_eq!(0.85, adsr.gain());

        adsr.set_gate(false);
        assert_eq!(0.85, adsr.gain());
        for _ in 0..50 {
            adsr.tick();
        }
        assert_eq!(0.425, adsr.gain());
        for _ in 0..50 {
            adsr.tick();
        }
        assert_eq!(0., adsr.gain());
    }

    #[test]
    fn gate_off_during_release() {
        let mut adsr = fixture();

        adsr.set_gate(true);
        for _ in 0..10 {
            adsr.tick();
        }
        assert_eq!(1., adsr.gain());

        for _ in 0..5 {
            adsr.tick();
        }
        assert_eq!(0.75, adsr.gain());

        adsr.set_gate(false);
        for _ in 0..50 {
            adsr.tick();
        }
        assert_eq!(0.375, adsr.gain());
        adsr.set_gate(false);
        assert_eq!(0.375, adsr.gain());
        for _ in 0..50 {
            adsr.tick();
        }
        assert_eq!(0., adsr.gain());
    }

    #[test]
    fn gate_on_during_attack() {
        let mut adsr = fixture();

        adsr.set_gate(true);
        for _ in 0..5 {
            adsr.tick();
        }
        assert_eq!(0.5, adsr.gain());

        adsr.set_gate(true);
        assert_eq!(0.5, adsr.gain());
    }

    #[test]
    fn gate_on_during_decay() {
        let mut adsr = fixture();

        adsr.set_gate(true);
        for _ in 0..10 {
            adsr.tick();
        }
        assert_eq!(1., adsr.gain());

        for _ in 0..3 {
            adsr.tick();
        }
        assert_eq!(0.85, adsr.gain());

        adsr.set_gate(true);
        assert_eq!(0.9, adsr.gain());
    }

    #[test]
    fn gate_on_during_sustain() {
        let mut adsr = fixture();

        adsr.set_gate(true);
        for _ in 0..10 {
            adsr.tick();
        }
        assert_eq!(1., adsr.gain());

        for _ in 0..5 {
            adsr.tick();
        }
        assert_eq!(0.75, adsr.gain());

        adsr.set_gate(true);
        assert_eq!(0.8, adsr.gain());
    }

    #[test]
    fn gate_on_during_release() {
        let mut adsr = fixture();

        adsr.set_gate(true);
        for _ in 0..10 {
            adsr.tick();
        }
        assert_eq!(1., adsr.gain());

        for _ in 0..5 {
            adsr.tick();
        }
        assert_eq!(0.75, adsr.gain());

        adsr.set_gate(false);
        for _ in 0..50 {
            adsr.tick();
        }
        assert_eq!(0.375, adsr.gain());

        adsr.set_gate(true);
        assert_eq!(0.4, adsr.gain());
    }

    fn fixture() -> Adsr {
        Adsr::new(10, 5, 0.75, 100)
    }
}
