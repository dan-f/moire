pub mod clock;
pub mod phasor;

pub fn ms_to_samples(sample_rate: usize, ms: u32) -> usize {
    ((sample_rate as f32 / 1000.) * ms as f32).round() as usize
}

pub fn bpm_to_freq(bpm: u32) -> f64 {
    bpm as f64 / 60.
}
