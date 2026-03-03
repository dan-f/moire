use num_rational::Rational64;

pub mod clock;
pub mod phasor;

pub fn ms_to_samples(sample_rate: usize, ms: u32) -> usize {
    ((sample_rate as f32 / 1000.) * ms as f32).round() as usize
}

pub fn bpm_to_freq(bpm: u32) -> Rational64 {
    Rational64::new(bpm as i64, 60)
}
