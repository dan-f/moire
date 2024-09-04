/// Tune a frequency using equal temperament
pub fn tune_equal(freq: f32, semis: i32) -> f32 {
    freq * 2_f32.powf((semis as f32) / 12.)
}
